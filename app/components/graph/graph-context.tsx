"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Connection, Edge, Node } from "@xyflow/react";
import { createClient } from "@/lib/supabase/client";
import type {
  DbEdge,
  DbNode,
  GraphEdge,
  NodeType,
} from "@/lib/types/graph";
import { dbEdgeToEdge, dbNodeToDisplayed, relayoutNodes } from "@/lib/graph/transform";

type GraphContextValue = {
  updateNode: (
    id: string,
    updates: { title?: string; body?: string },
  ) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;
  addNode: (type: NodeType) => Promise<void>;
  addEdge: (source: string, target: string) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;
  isBusy: boolean;
};

const GraphContext = createContext<GraphContextValue | null>(null);

export function useGraph() {
  const ctx = useContext(GraphContext);
  if (!ctx) {
    throw new Error("useGraph must be used within GraphProvider");
  }
  return ctx;
}

type GraphProviderProps = {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
  children: (props: {
    nodes: Node[];
    edges: Edge[];
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
    onEdge: (edge: Connection) => void;
    onNodesDelete: (deleted: Node[]) => void;
    onEdgesDelete: (deleted: Edge[]) => void;
  }) => ReactNode;
};

export function GraphProvider({
  initialNodes,
  initialEdges,
  children,
}: GraphProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [isBusy, setIsBusy] = useState(false);

  const initialGraph = useMemo(
    () => ({
      nodes: initialNodes.map(dbNodeToDisplayed),
      edges: initialEdges.map(dbEdgeToEdge),
    }),
    [initialNodes, initialEdges],
  );

  const [nodes, setNodes] = useState<Node[]>(() =>
    relayoutNodes(initialGraph.nodes, initialGraph.edges),
  );
  const [edges, setEdges] = useState<Edge[]>(initialGraph.edges);

  const applyLayout = useCallback(
    (nextNodes: Node[], nextEdges: GraphEdge[]) => {
      const displayed = nextNodes.map((node) => ({
        id: node.id,
        type: node.type as NodeType,
        data: node.data as { title: string; body?: string },
      }));

      setNodes(relayoutNodes(displayed, nextEdges));
      setEdges(nextEdges);
    },
    [],
  );

  const addNode = useCallback(
    async (type: NodeType) => {
      setIsBusy(true);

      const { data, error } = await supabase
        .from("nodes")
        .insert({
          type,
          title: type === "content" ? "Untitled content" : "New concept",
          body: type === "content" ? "Start writing…" : "",
        })
        .select()
        .single();

      setIsBusy(false);

      if (error || !data) {
        console.error(error);
        return;
      }

      const displayed = dbNodeToDisplayed(data as DbNode);
      const nextNodes = [
        ...nodes,
        {
          id: displayed.id,
          type: displayed.type,
          data: displayed.data,
          position: { x: 0, y: 0 },
        },
      ];

      applyLayout(nextNodes, edges as GraphEdge[]);
    },
    [applyLayout, edges, nodes, supabase],
  );

  const updateNode = useCallback(
    async (id: string, updates: { title?: string; body?: string }) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;

      const nextData = { ...node.data, ...updates };

      setNodes((current) =>
        current.map((n) =>
          n.id === id ? { ...n, data: nextData } : n,
        ),
      );

      const { error } = await supabase
        .from("nodes")
        .update({
          title: nextData.title,
          ...(node.type === "content" ? { body: nextData.body ?? "" } : {}),
        })
        .eq("id", id);

      if (error) {
        console.error(error);
        setNodes(nodes);
      }
    },
    [nodes, supabase],
  );

  const deleteNode = useCallback(
    async (id: string) => {
      const previousNodes = nodes;
      const previousEdges = edges;

      const nextEdges = (edges as GraphEdge[]).filter(
        (edge) => edge.source !== id && edge.target !== id,
      );
      const nextNodes = nodes.filter((node) => node.id !== id);

      applyLayout(nextNodes, nextEdges);

      const { error } = await supabase.from("nodes").delete().eq("id", id);

      if (error) {
        console.error(error);
        setNodes(previousNodes);
        setEdges(previousEdges);
      }
    },
    [applyLayout, edges, nodes, supabase],
  );

  const addEdge = useCallback(
    async (source: string, target: string) => {
      if (source === target) return;

      const exists = (edges as GraphEdge[]).some(
        (edge) => edge.source === source && edge.target === target,
      );
      if (exists) return;

      setIsBusy(true);

      const { data, error } = await supabase
        .from("edges")
        .insert({ from_node_id: source, to_node_id: target })
        .select()
        .single();

      setIsBusy(false);

      if (error || !data) {
        console.error(error);
        return;
      }

      const newEdge = dbEdgeToEdge(data as DbEdge);
      applyLayout(nodes, [...(edges as GraphEdge[]), newEdge]);
    },
    [applyLayout, edges, nodes, supabase],
  );

  const deleteEdge = useCallback(
    async (id: string) => {
      const previousEdges = edges;

      const nextEdges = (edges as GraphEdge[]).filter((edge) => edge.id !== id);
      applyLayout(nodes, nextEdges);

      const { error } = await supabase.from("edges").delete().eq("id", id);

      if (error) {
        console.error(error);
        setEdges(previousEdges);
      }
    },
    [applyLayout, edges, nodes, supabase],
  );

  const onEdge = useCallback(
    (edge: Connection) => {
      if (!edge.source || !edge.target) return;
      void addEdge(edge.source, edge.target);
    },
    [addEdge],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((node) => node.id));

      setEdges((current) =>
        current.filter(
          (edge) =>
            !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
        ),
      );

      for (const node of deleted) {
        void supabase.from("nodes").delete().eq("id", node.id);
      }
    },
    [supabase],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const edge of deleted) {
        void supabase.from("edges").delete().eq("id", edge.id);
      }
    },
    [supabase],
  );

  const value = useMemo(
    () => ({
      addNode,
      updateNode,
      deleteNode,
      addEdge,
      deleteEdge,
      isBusy,
    }),
    [addEdge, addNode, deleteEdge, deleteNode, isBusy, updateNode],
  );

  return (
    <GraphContext.Provider value={value}>
      {children({
        nodes,
        edges,
        setNodes,
        setEdges,
        onEdge,
        onNodesDelete,
        onEdgesDelete,
      })}
    </GraphContext.Provider>
  );
}
