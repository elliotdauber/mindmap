import type { GraphEdge, NodeType } from "@/lib/types/graph";

type UndoNode = {
  id: string;
  type: NodeType;
  title: string;
  body: string;
};

export type UndoEntry =
  | { type: "add-node"; node: UndoNode; edge?: GraphEdge }
  | { type: "delete-node"; node: UndoNode; edges: GraphEdge[] }
  | { type: "add-edge"; edge: GraphEdge }
  | { type: "delete-edge"; edge: GraphEdge };

export const UNDO_LIMIT = 50;
