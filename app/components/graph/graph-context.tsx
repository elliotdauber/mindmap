"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Edge, Node } from "@xyflow/react";
import { createClient } from "@/lib/supabase/client";
import type { DbEdge, DbNode, GraphEdge, NodeType } from "@/lib/types/graph";
import { dbEdgeToEdge, dbNodeToDisplayed, normalizeEdges } from "@/lib/graph/transform";
import { routeEdges, type Rect } from "@/lib/graph/route";
import { UNDO_LIMIT, type UndoEntry } from "@/lib/graph/undo";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  clusterLayout,
} from "./layout/clusterLayout";

export type GraphNode = {
  id: string;
  type: NodeType;
  title: string;
  body: string;
};

type GraphContextValue = {
  nodes: GraphNode[];
  nodeCount: number;
  edgeCount: number;
  isBusy: boolean;
  /** True while the map is gliding into new positions after a structural change. */
  isSettling: boolean;
  selectedNodeId: string | null;
  linkSourceId: string | null;
  linkSourceType: NodeType | null;
  isLinking: boolean;
  isLinkableTarget: (id: string) => boolean;
  hasLinkTargets: (id: string) => boolean;
  openNode: GraphNode | null;
  openNodeNeighbours: GraphNode[];
  viewportFocusId: string | null;
  pulseNodeId: string | null;
  searchOpen: boolean;
  canUndo: boolean;
  addNode: (type: NodeType) => Promise<void>;
  updateNode: (
    id: string,
    updates: { title?: string; body?: string },
  ) => Promise<void>;
  deleteNode: (id: string, options?: { skipUndo?: boolean }) => Promise<void>;
  deleteEdge: (id: string, options?: { skipUndo?: boolean }) => Promise<void>;
  deleteSelection: () => void;
  startLink: (id: string, leaving?: { title: string; body: string }) => void;
  cancelLink: () => void;
  open: (id: string, leaving?: { title: string; body: string }) => void;
  close: (snapshot?: { title: string; body: string }) => void;
  consumeViewportFocus: () => void;
  jumpToNode: (id: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  undo: () => Promise<void>;
};

const GraphContext = createContext<GraphContextValue | null>(null);

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) {
    throw new Error("useGraph must be used within GraphProvider");
  }
  return ctx;
}

type RenderProps = {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onPaneClick: () => void;
};

type GraphProviderProps = {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
  children: (props: RenderProps) => ReactNode;
};

/**
 * Content is only ever related through a concept, so two content nodes may
 * never be linked to each other directly.
 */
function isLinkAllowed(
  nodes: GraphNode[],
  sourceId: string,
  targetId: string,
) {
  if (sourceId === targetId) return false;

  const source = nodes.find((node) => node.id === sourceId);
  const target = nodes.find((node) => node.id === targetId);
  if (!source || !target) return false;

  return !(source.type === "content" && target.type === "content");
}

/** How long the cards take to glide once the layout has changed. */
const SETTLE_MS = 520;

export function GraphProvider({
  initialNodes,
  initialEdges,
  children,
}: GraphProviderProps) {
  const supabase = useMemo(() => createClient(), []);

  const [nodes, setNodes] = useState<GraphNode[]>(() =>
    initialNodes.map((row) => {
      const displayed = dbNodeToDisplayed(row);
      return {
        id: displayed.id,
        type: displayed.type,
        title: displayed.data.title,
        body: displayed.data.body ?? "",
      };
    }),
  );
  const [edges, setEdges] = useState<GraphEdge[]>(() =>
    normalizeEdges(
      initialNodes.map((row) => row.id),
      initialEdges.map(dbEdgeToEdge),
    ),
  );

  const [isBusy, setIsBusy] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [viewportFocusId, setViewportFocusId] = useState<string | null>(null);
  const [pulseNodeId, setPulseNodeId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedNodeRef = useRef(selectedNodeId);
  const selectedEdgeRef = useRef(selectedEdgeId);
  const linkSourceRef = useRef(linkSourceId);
  const openNodeIdRef = useRef(openNodeId);
  const draftNodeIdsRef = useRef(new Set<string>());
  const undoStackRef = useRef<UndoEntry[]>([]);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushUndo = useCallback((entry: UndoEntry) => {
    undoStackRef.current.push(entry);
    if (undoStackRef.current.length > UNDO_LIMIT) {
      undoStackRef.current.shift();
    }
    setCanUndo(true);
  }, []);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  selectedNodeRef.current = selectedNodeId;
  selectedEdgeRef.current = selectedEdgeId;
  linkSourceRef.current = linkSourceId;
  openNodeIdRef.current = openNodeId;

  const nodeIds = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);

  const links = useMemo(
    () => normalizeEdges(nodeIds, edges),
    [edges, nodeIds],
  );

  // Drop orphan or duplicate rows left in state after a fast discard.
  useEffect(() => {
    const normalized = normalizeEdges(nodeIds, edges);
    if (normalized.length !== edges.length) {
      setEdges(normalized);
    }
  }, [edges, nodeIds]);

  // Placement is a pure function of structure, so it is recomputed only when a
  // card or connection is actually added or removed.
  const positions = useMemo(
    () =>
      clusterLayout(
        nodes.map((node) => ({ id: node.id, type: node.type })),
        links.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
      ),
    [links, nodes],
  );

  const routes = useMemo(() => {
    const rects: Rect[] = nodesRef.current.map((node) => {
      const point = positions.get(node.id) ?? { x: 0, y: 0 };
      return {
        id: node.id,
        x: point.x,
        y: point.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      };
    });

    return routeEdges(rects, links);
  }, [links, positions]);

  // Connections are redrawn at their final geometry immediately while the cards
  // glide, so they get softened for the length of that glide.
  const [isSettling, setIsSettling] = useState(false);
  const firstLayout = useRef(true);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false;
      return;
    }

    setIsSettling(true);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setIsSettling(false), SETTLE_MS);

    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [positions]);

  const cancelLink = useCallback(() => {
    setLinkSourceId(null);
  }, []);

  const consumeViewportFocus = useCallback(() => {
    setViewportFocusId(null);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setLinkSourceId(null);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
  }, []);

  const jumpToNode = useCallback((id: string) => {
    if (!nodesRef.current.some((node) => node.id === id)) return;

    setSearchOpen(false);
    setOpenNodeId(null);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setLinkSourceId(null);
    setViewportFocusId(id);
    setPulseNodeId(id);

    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulseNodeId(null), 1800);
  }, []);

  const addNode = useCallback(
    async (type: NodeType) => {
      setIsBusy(true);

      const linkFrom = selectedNodeRef.current;

      const { data, error } = await supabase
        .from("nodes")
        .insert({ type, title: "", body: "" })
        .select()
        .single();

      if (error || !data) {
        console.error(error);
        setIsBusy(false);
        return;
      }

      const created = dbNodeToDisplayed(data as DbNode);
      const createdNode: GraphNode = {
        id: created.id,
        type: created.type,
        title: created.data.title,
        body: created.data.body ?? "",
      };

      const sourceType = linkFrom
        ? nodesRef.current.find((node) => node.id === linkFrom)?.type
        : undefined;
      const autoLink =
        Boolean(linkFrom) && !(sourceType === "content" && type === "content");

      let createdEdge: GraphEdge | undefined;

      if (autoLink && linkFrom && linkFrom !== created.id) {
        const { data: edgeRow, error: edgeError } = await supabase
          .from("edges")
          .insert({ from_node_id: linkFrom, to_node_id: created.id })
          .select()
          .single();

        if (edgeError) {
          console.error(edgeError);
        } else if (edgeRow) {
          const edge = dbEdgeToEdge(edgeRow as DbEdge);
          const ids = new Set(nodesRef.current.map((node) => node.id));

          if (ids.has(edge.source) && ids.has(edge.target)) {
            createdEdge = edge;
            setEdges((current) => normalizeEdges(ids, [...current, edge]));
          } else {
            // The card was discarded before the auto-link finished.
            void supabase.from("edges").delete().eq("id", edgeRow.id);
          }
        }
      }

      setNodes((current) => [...current, createdNode]);

      draftNodeIdsRef.current.add(created.id);
      pushUndo({ type: "add-node", node: createdNode, edge: createdEdge });

      setSelectedNodeId(created.id);
      setSelectedEdgeId(null);
      setLinkSourceId(null);
      setOpenNodeId(created.id);
      setViewportFocusId(created.id);
      setIsBusy(false);
    },
    [pushUndo, supabase],
  );

  const updateNode = useCallback(
    async (id: string, updates: { title?: string; body?: string }) => {
      const previous = nodesRef.current;
      const node = previous.find((candidate) => candidate.id === id);
      if (!node) return;

      const next = { ...node, ...updates };
      setNodes(previous.map((card) => (card.id === id ? next : card)));

      if (next.title.trim() || next.body.trim()) {
        draftNodeIdsRef.current.delete(id);
      }

      const { error } = await supabase
        .from("nodes")
        .update({ title: next.title, body: next.body })
        .eq("id", id);

      if (error) {
        console.error(error);
        setNodes(previous);
      }
    },
    [supabase],
  );

  const deleteNode = useCallback(
    async (id: string, options?: { skipUndo?: boolean }) => {
      const previousNodes = nodesRef.current;
      const previousEdges = edgesRef.current;
      const node = previousNodes.find((candidate) => candidate.id === id);
      if (!node) return;

      const connectedEdges = previousEdges.filter(
        (edge) => edge.source === id || edge.target === id,
      );

      if (!options?.skipUndo) {
        pushUndo({ type: "delete-node", node, edges: connectedEdges });
      }

      setNodes(previousNodes.filter((candidate) => candidate.id !== id));
      setEdges(
        normalizeEdges(
          new Set(previousNodes.filter((node) => node.id !== id).map((node) => node.id)),
          previousEdges.filter(
            (edge) => edge.source !== id && edge.target !== id,
          ),
        ),
      );

      if (selectedNodeRef.current === id) setSelectedNodeId(null);
      if (linkSourceRef.current === id) setLinkSourceId(null);
      setOpenNodeId((current) => (current === id ? null : current));
      draftNodeIdsRef.current.delete(id);

      const { error } = await supabase.from("nodes").delete().eq("id", id);

      if (error) {
        console.error(error);
        setNodes(previousNodes);
        setEdges(previousEdges);
      }
    },
    [pushUndo, supabase],
  );

  const deleteEdge = useCallback(
    async (id: string, options?: { skipUndo?: boolean }) => {
      const previousEdges = edgesRef.current;
      const edge = previousEdges.find((candidate) => candidate.id === id);
      if (!edge) return;

      if (!options?.skipUndo) {
        pushUndo({ type: "delete-edge", edge });
      }

      setEdges(previousEdges.filter((candidate) => candidate.id !== id));

      if (selectedEdgeRef.current === id) setSelectedEdgeId(null);

      const { error } = await supabase.from("edges").delete().eq("id", id);

      if (error) {
        console.error(error);
        setEdges(previousEdges);
      }
    },
    [pushUndo, supabase],
  );

  const finalizeEditor = useCallback(
    (snapshot?: { title: string; body: string }) => {
      const openId = openNodeIdRef.current;
      if (!openId) return;

      const node = nodesRef.current.find((candidate) => candidate.id === openId);
      const title = (snapshot?.title ?? node?.title ?? "").trim();
      const body = (snapshot?.body ?? node?.body ?? "").trim();

      if (draftNodeIdsRef.current.has(openId) && !title && !body) {
        draftNodeIdsRef.current.delete(openId);
        undoStackRef.current = undoStackRef.current.filter(
          (entry) => !(entry.type === "add-node" && entry.node.id === openId),
        );
        setCanUndo(undoStackRef.current.length > 0);
        void deleteNode(openId, { skipUndo: true });
        return;
      }

      if (
        snapshot &&
        node &&
        (snapshot.title !== node.title || snapshot.body !== node.body)
      ) {
        void updateNode(openId, {
          title: snapshot.title,
          body: snapshot.body,
        });
      }
    },
    [deleteNode, updateNode],
  );

  const open = useCallback(
    (id: string, leaving?: { title: string; body: string }) => {
      const current = openNodeIdRef.current;
      if (current && current !== id) {
        finalizeEditor(leaving);
      }

      setOpenNodeId(id);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      setLinkSourceId(null);
    },
    [finalizeEditor],
  );

  const close = useCallback(
    (snapshot?: { title: string; body: string }) => {
      finalizeEditor(snapshot);
      setOpenNodeId(null);
    },
    [finalizeEditor],
  );

  const startLink = useCallback(
    (id: string, leaving?: { title: string; body: string }) => {
      if (openNodeIdRef.current) {
        finalizeEditor(leaving);
      }

      setLinkSourceId(id);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      setOpenNodeId(null);
    },
    [finalizeEditor],
  );

  const linkTo = useCallback(
    async (targetId: string) => {
      const source = linkSourceRef.current;
      setLinkSourceId(null);

      if (!source || !isLinkAllowed(nodesRef.current, source, targetId)) return;

      // Connections read as undirected in the UI, so a link in either stored
      // direction already represents this pair.
      const duplicate = edgesRef.current.some(
        (edge) =>
          (edge.source === source && edge.target === targetId) ||
          (edge.source === targetId && edge.target === source),
      );

      setSelectedNodeId(targetId);

      if (duplicate) return;

      setIsBusy(true);

      const { data, error } = await supabase
        .from("edges")
        .insert({ from_node_id: source, to_node_id: targetId })
        .select()
        .single();

      setIsBusy(false);

      if (error || !data) {
        console.error(error);
        return;
      }

      const edge = dbEdgeToEdge(data as DbEdge);
      pushUndo({ type: "add-edge", edge });

      setEdges((current) =>
        normalizeEdges(
          new Set(nodesRef.current.map((node) => node.id)),
          [...current, edge],
        ),
      );
    },
    [pushUndo, supabase],
  );

  const onNodeClick = useCallback(
    (id: string) => {
      const source = linkSourceRef.current;

      if (source) {
        if (source === id) {
          setLinkSourceId(null);
          return;
        }

        // Stay in link mode when an ineligible node is clicked so the pick can
        // be retried without starting over.
        if (!isLinkAllowed(nodesRef.current, source, id)) return;

        void linkTo(id);
        return;
      }

      setSelectedNodeId(id);
      setSelectedEdgeId(null);
    },
    [linkTo],
  );

  const onEdgeClick = useCallback((id: string) => {
    setSelectedEdgeId(id);
    setSelectedNodeId(null);
    setLinkSourceId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setLinkSourceId(null);
  }, []);

  const undo = useCallback(async () => {
    const entry = undoStackRef.current.pop();
    if (!entry) {
      setCanUndo(false);
      return;
    }

    setCanUndo(undoStackRef.current.length > 0);

    switch (entry.type) {
      case "add-node": {
        await deleteNode(entry.node.id, { skipUndo: true });
        break;
      }

      case "delete-node": {
        const { error } = await supabase.from("nodes").insert({
          id: entry.node.id,
          type: entry.node.type,
          title: entry.node.title,
          body: entry.node.body,
        });

        if (error) {
          console.error(error);
          pushUndo(entry);
          return;
        }

        setNodes((current) => [...current, entry.node]);

        const restoredIds = new Set([
          ...nodesRef.current.map((node) => node.id),
          entry.node.id,
        ]);

        if (entry.edges.length > 0) {
          const { error: edgeError } = await supabase.from("edges").insert(
            entry.edges.map((edge) => ({
              id: edge.id,
              from_node_id: edge.source,
              to_node_id: edge.target,
            })),
          );

          if (edgeError) {
            console.error(edgeError);
          } else {
            setEdges((current) =>
              normalizeEdges(restoredIds, [...current, ...entry.edges]),
            );
          }
        }

        setSelectedNodeId(entry.node.id);
        setViewportFocusId(entry.node.id);
        break;
      }

      case "add-edge": {
        await deleteEdge(entry.edge.id, { skipUndo: true });
        break;
      }

      case "delete-edge": {
        const { data, error } = await supabase
          .from("edges")
          .insert({
            id: entry.edge.id,
            from_node_id: entry.edge.source,
            to_node_id: entry.edge.target,
          })
          .select()
          .single();

        if (error || !data) {
          console.error(error);
          pushUndo(entry);
          return;
        }

        const edge = dbEdgeToEdge(data as DbEdge);
        setEdges((current) =>
          normalizeEdges(
            new Set(nodesRef.current.map((node) => node.id)),
            [...current, edge],
          ),
        );
        break;
      }
    }
  }, [deleteEdge, deleteNode, pushUndo, supabase]);

  const deleteSelection = useCallback(() => {
    if (selectedEdgeRef.current) {
      void deleteEdge(selectedEdgeRef.current);
      return;
    }

    if (selectedNodeRef.current) {
      void deleteNode(selectedNodeRef.current);
    }
  }, [deleteEdge, deleteNode]);

  const flowNodes = useMemo<Node[]>(
    () =>
      nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: positions.get(node.id) ?? { x: 0, y: 0 },
        // Fixed dimensions, so React Flow never has to measure the card and the
        // layout can't be affected by its contents.
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        data: { title: node.title, body: node.body },
        className: node.id === pulseNodeId ? "is-pulsing" : undefined,
        selected: node.id === selectedNodeId,
        draggable: false,
        connectable: false,
        deletable: false,
      })),
    [nodes, positions, pulseNodeId, selectedNodeId],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      links.map((edge) => ({
        ...edge,
        data: routes.get(edge.id),
        selected: edge.id === selectedEdgeId,
      })),
    [links, routes, selectedEdgeId],
  );

  const linkSourceType = useMemo(() => {
    if (!linkSourceId) return null;
    return nodes.find((node) => node.id === linkSourceId)?.type ?? null;
  }, [linkSourceId, nodes]);

  const isLinkableTarget = useCallback(
    (id: string) =>
      linkSourceId !== null && isLinkAllowed(nodes, linkSourceId, id),
    [linkSourceId, nodes],
  );

  const hasLinkTargets = useCallback(
    (id: string) => nodes.some((node) => isLinkAllowed(nodes, id, node.id)),
    [nodes],
  );

  const openNode = useMemo(
    () => nodes.find((node) => node.id === openNodeId) ?? null,
    [nodes, openNodeId],
  );

  const openNodeNeighbours = useMemo(() => {
    if (!openNodeId) return [];

    const ids = new Set(
      links
        .filter(
          (edge) => edge.source === openNodeId || edge.target === openNodeId,
        )
        .map((edge) => (edge.source === openNodeId ? edge.target : edge.source)),
    );

    return nodes.filter((node) => ids.has(node.id));
  }, [links, nodes, openNodeId]);

  const value = useMemo<GraphContextValue>(
    () => ({
      nodes,
      nodeCount: nodes.length,
      edgeCount: links.length,
      isBusy,
      isSettling,
      selectedNodeId,
      linkSourceId,
      linkSourceType,
      isLinking: linkSourceId !== null,
      isLinkableTarget,
      hasLinkTargets,
      openNode,
      openNodeNeighbours,
      viewportFocusId,
      pulseNodeId,
      searchOpen,
      canUndo,
      addNode,
      updateNode,
      deleteNode,
      deleteEdge,
      deleteSelection,
      startLink,
      cancelLink,
      open,
      close,
      consumeViewportFocus,
      jumpToNode,
      openSearch,
      closeSearch,
      undo,
    }),
    [
      addNode,
      cancelLink,
      canUndo,
      close,
      closeSearch,
      consumeViewportFocus,
      deleteEdge,
      deleteNode,
      deleteSelection,
      jumpToNode,
      links.length,
      hasLinkTargets,
      isBusy,
      isLinkableTarget,
      isSettling,
      linkSourceId,
      linkSourceType,
      nodes,
      open,
      openNode,
      openNodeNeighbours,
      openSearch,
      pulseNodeId,
      searchOpen,
      selectedNodeId,
      startLink,
      undo,
      updateNode,
      viewportFocusId,
    ],
  );

  return (
    <GraphContext.Provider value={value}>
      {children({
        nodes: flowNodes,
        edges: flowEdges,
        onNodeClick,
        onEdgeClick,
        onPaneClick,
      })}
    </GraphContext.Provider>
  );
}
