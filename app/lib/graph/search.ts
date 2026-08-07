import type { NodeType } from "@/lib/types/graph";

export type SearchableNode = {
  id: string;
  type: NodeType;
  title: string;
  body: string;
};

export type SearchResult = {
  id: string;
  type: NodeType;
  title: string;
  snippet: string;
  score: number;
};

function snippet(body: string, query: string) {
  const lower = body.toLowerCase();
  const index = lower.indexOf(query);
  if (index < 0) return "";

  const start = Math.max(0, index - 24);
  const end = Math.min(body.length, index + query.length + 48);
  const slice = body.slice(start, end).replace(/\s+/g, " ").trim();

  if (start > 0) return `…${slice}`;
  return slice;
}

export function searchNodes(
  nodes: SearchableNode[],
  query: string,
  limit = 12,
): SearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const results: SearchResult[] = [];

  for (const node of nodes) {
    const title = node.title.trim();
    const body = node.body.trim();
    const titleLower = title.toLowerCase();
    const bodyLower = body.toLowerCase();

    let score = 0;

    if (titleLower === needle) score += 8;
    else if (titleLower.startsWith(needle)) score += 5;
    else if (titleLower.includes(needle)) score += 3;

    if (bodyLower.includes(needle)) score += 1;

    if (!score) continue;

    results.push({
      id: node.id,
      type: node.type,
      title: title || `untitled ${node.type}`,
      snippet: snippet(body, needle),
      score,
    });
  }

  return results
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    )
    .slice(0, limit);
}
