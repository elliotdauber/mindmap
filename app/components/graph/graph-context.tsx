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
import { dbEdgeToEdge, dbNodeToDisplayed } from "@/lib/graph/transform";
import { routeEdges, type Rect } from "@/lib/graph/route";
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
  addNode: (type: NodeType) => Promise<void>;
  updateNode: (
    id: string,
    updates: { title?: string; body?: string },
  ) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  deleteSelection: () => void;
  startLink: (id: string) => void;
  cancelLink: () => void;
  open: (id: string) => void;
  close: () => void;
  consumeViewportFocus: () => void;
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

/**
 * Everything the placement depends on: which cards exist, what they are, and
 * how they connect. Titles, bodies and selection are deliberately absent, so
 * editing or clicking can never move the map.
 */
function structureKey(nodes: GraphNode[], edges: GraphEdge[]) {
  const cards = nodes
    .map((node) => `${node.id}:${node.type}`)
    .sort()
    .join(",");

  const links = edges
    .map((edge) =>
      edge.source < edge.target
        ? `${edge.source}>${edge.target}`
        : `${edge.target}>${edge.source}`,
    )
    .sort()
    .join(",");

  return `${cards}|${links}`;
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
    initialEdges.map(dbEdgeToEdge),
  );

  const [isBusy, setIsBusy] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkSourceId, setLinkSourceId] = useState<string | null>(null);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [viewportFocusId, setViewportFocusId] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const selectedNodeRef = useRef(selectedNodeId);
  const selectedEdgeRef = useRef(selectedEdgeId);
  const linkSourceRef = useRef(linkSourceId);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  selectedNodeRef.current = selectedNodeId;
  selectedEdgeRef.current = selectedEdgeId;
  linkSourceRef.current = linkSourceId;

  const key = structureKey(nodes, edges);

  // Placement is a pure function of the structure key, so it is recomputed only
  // when a card or connection is actually added or removed.
  const positions = useMemo(
    () =>
      clusterLayout(
        nodesRef.current.map((node) => ({ id: node.id, type: node.type })),
        edgesRef.current.map((edge) => ({
          source: edge.source,
          target: edge.target,
        })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
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

    return routeEdges(rects, edgesRef.current);
  }, [positions]);

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

  const startLink = useCallback((id: string) => {
    setLinkSourceId(id);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setOpenNodeId(null);
  }, []);

  const cancelLink = useCallback(() => {
    setLinkSourceId(null);
  }, []);

  const open = useCallback((id: string) => {
    setOpenNodeId(id);
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setLinkSourceId(null);
  }, []);

  const close = useCallback(() => {
    setOpenNodeId(null);
  }, []);

  const consumeViewportFocus = useCallback(() => {
    setViewportFocusId(null);
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

      const sourceType = linkFrom
        ? nodesRef.current.find((node) => node.id === linkFrom)?.type
        : undefined;
      const autoLink =
        Boolean(linkFrom) && !(sourceType === "content" && type === "content");

      if (autoLink && linkFrom && linkFrom !== created.id) {
        const { data: edgeRow, error: edgeError } = await supabase
          .from("edges")
          .insert({ from_node_id: linkFrom, to_node_id: created.id })
          .select()
          .single();

        if (edgeError) {
          console.error(edgeError);
        } else if (edgeRow) {
          setEdges((current) => [...current, dbEdgeToEdge(edgeRow as DbEdge)]);
        }
      }

      setNodes((current) => [
        ...current,
        {
          id: created.id,
          type: created.type,
          title: created.data.title,
          body: created.data.body ?? "",
        },
      ]);

      setSelectedNodeId(created.id);
      setSelectedEdgeId(null);
      setLinkSourceId(null);
      setOpenNodeId(created.id);
      setViewportFocusId(created.id);
      setIsBusy(false);
    },
    [supabase],
  );

  const updateNode = useCallback(
    async (id: string, updates: { title?: string; body?: string }) => {
      const previous = nodesRef.current;
      const node = previous.find((candidate) => candidate.id === id);
      if (!node) return;

      const next = { ...node, ...updates };
      setNodes(previous.map((card) => (card.id === id ? next : card)));

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
    async (id: string) => {
      const previousNodes = nodesRef.current;
      const previousEdges = edgesRef.current;

      setNodes(previousNodes.filter((node) => node.id !== id));
      setEdges(
        previousEdges.filter(
          (edge) => edge.source !== id && edge.target !== id,
        ),
      );

      if (selectedNodeRef.current === id) setSelectedNodeId(null);
      if (linkSourceRef.current === id) setLinkSourceId(null);
      setOpenNodeId((current) => (current === id ? null : current));

      const { error } = await supabase.from("nodes").delete().eq("id", id);

      if (error) {
        console.error(error);
        setNodes(previousNodes);
        setEdges(previousEdges);
      }
    },
    [supabase],
  );

  const deleteEdge = useCallback(
    async (id: string) => {
      const previousEdges = edgesRef.current;
      setEdges(previousEdges.filter((edge) => edge.id !== id));

      if (selectedEdgeRef.current === id) setSelectedEdgeId(null);

      const { error } = await supabase.from("edges").delete().eq("id", id);

      if (error) {
        console.error(error);
        setEdges(previousEdges);
      }
    },
    [supabase],
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

      setEdges((current) => [...current, dbEdgeToEdge(data as DbEdge)]);
    },
    [supabase],
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
        selected: node.id === selectedNodeId,
        draggable: false,
        connectable: false,
        deletable: false,
      })),
    [nodes, positions, selectedNodeId],
  );

  const flowEdges = useMemo<Edge[]>(
    () =>
      edges.map((edge) => ({
        ...edge,
        data: routes.get(edge.id),
        selected: edge.id === selectedEdgeId,
      })),
    [edges, routes, selectedEdgeId],
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
      edges
        .filter(
          (edge) => edge.source === openNodeId || edge.target === openNodeId,
        )
        .map((edge) => (edge.source === openNodeId ? edge.target : edge.source)),
    );

    return nodes.filter((node) => ids.has(node.id));
  }, [edges, nodes, openNodeId]);

  const value = useMemo<GraphContextValue>(
    () => ({
      nodeCount: nodes.length,
      edgeCount: edges.length,
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
    }),
    [
      addNode,
      cancelLink,
      close,
      consumeViewportFocus,
      deleteEdge,
      deleteNode,
      deleteSelection,
      edges.length,
      hasLinkTargets,
      isBusy,
      isLinkableTarget,
      isSettling,
      linkSourceId,
      linkSourceType,
      nodes.length,
      open,
      openNode,
      openNodeNeighbours,
      selectedNodeId,
      startLink,
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
