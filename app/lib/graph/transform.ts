import type { DbEdge, DbNode, DisplayedNode, GraphEdge } from "@/lib/types/graph";

export function dbNodeToDisplayed(node: DbNode): DisplayedNode {
  return {
    id: node.id,
    type: node.type,
    data: {
      title: node.title,
      body: node.body,
    },
  };
}

export function dbEdgeToEdge(edge: DbEdge): GraphEdge {
  return {
    id: edge.id,
    source: edge.from_node_id,
    target: edge.to_node_id,
    type: "relationship",
  };
}
