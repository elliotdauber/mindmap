import type { DisplayedNode, GraphEdge } from "@/lib/types/graph";
import dagre from "dagre";

export function autoLayout(nodes: DisplayedNode[], edges: GraphEdge[]) {
  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: "LR",
    nodesep: 80,
    ranksep: 120,
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: node.type === "concept" ? 160 : 260,
      height: node.type === "concept" ? 50 : 140,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id);

    return {
      ...node,
      position: {
        x: position.x - position.width / 2,
        y: position.y - position.height / 2,
      },
    };
  });
}
