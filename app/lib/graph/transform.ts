import type {
  DbEdge,
  DbNode,
  DisplayedNode,
  GraphEdge,
} from "@/lib/types/graph";
import { autoLayout } from "@/components/graph/layout/autoLayout";

export function dbNodeToDisplayed(node: DbNode): DisplayedNode {
  return {
    id: node.id,
    type: node.type,
    data: {
      title: node.title,
      ...(node.type === "content" ? { body: node.body } : {}),
    },
  };
}

export function dbEdgeToEdge(edge: DbEdge): GraphEdge {
  return {
    id: edge.id,
    source: edge.from_node_id,
    target: edge.to_node_id,
  };
}

export function buildFlowGraph(nodes: DbNode[], edges: DbEdge[]) {
  const displayed = nodes.map(dbNodeToDisplayed);
  const graphEdges = edges.map(dbEdgeToEdge);

  return {
    nodes: autoLayout(displayed, graphEdges),
    edges: graphEdges,
  };
}

export function relayoutNodes(nodes: DisplayedNode[], edges: GraphEdge[]) {
  const stripped = nodes.map(({ id, type, data }) => ({ id, type, data }));
  return autoLayout(stripped, edges);
}
