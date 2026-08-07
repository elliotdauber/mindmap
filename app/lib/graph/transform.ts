import type { DbEdge, DbNode, DisplayedNode, GraphEdge } from "@/lib/types/graph";

export function linkPairKey(source: string, target: string) {
  return source < target ? `${source}|${target}` : `${target}|${source}`;
}

/** Links are undirected in the UI — keep one row per pair and drop broken ones. */
export function normalizeEdges(
  nodeIds: Iterable<string>,
  edges: GraphEdge[],
): GraphEdge[] {
  const ids = nodeIds instanceof Set ? nodeIds : new Set(nodeIds);
  const seen = new Set<string>();
  const result: GraphEdge[] = [];

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;

    const key = linkPairKey(edge.source, edge.target);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(edge);
  }

  return result;
}

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
