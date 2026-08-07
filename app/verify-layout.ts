import { mkdirSync, writeFileSync } from "node:fs";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  clusterLayout,
} from "./components/graph/layout/clusterLayout";
import { routeEdges, type Rect } from "./lib/graph/route";
import type { NodeType } from "./lib/types/graph";

type Case = {
  name: string;
  nodes: { id: string; type: NodeType }[];
  edges: { source: string; target: string }[];
};

function hub(name: string, concepts: number, contentPer: number): Case {
  const nodes: Case["nodes"] = [];
  const edges: Case["edges"] = [];

  for (let c = 0; c < concepts; c += 1) {
    const conceptId = `concept-${c}`;
    nodes.push({ id: conceptId, type: "concept" });

    for (let n = 0; n < contentPer; n += 1) {
      const contentId = `content-${c}-${n}`;
      nodes.push({ id: contentId, type: "content" });
      edges.push({ source: contentId, target: conceptId });
    }

    if (c > 0) edges.push({ source: `concept-${c - 1}`, target: conceptId });
  }

  return { name, nodes, edges };
}

/** Content shared between concepts, which is what makes the map a web. */
function shared(name: string, concepts: number, contentPer: number): Case {
  const base = hub(name, concepts, contentPer);

  base.nodes
    .filter((node) => node.type === "content")
    .forEach((node, index) => {
      if (index % 3 !== 0) return;
      const other = `concept-${(index * 2 + 1) % concepts}`;
      const exists = base.edges.some(
        (edge) =>
          (edge.source === node.id && edge.target === other) ||
          (edge.source === other && edge.target === node.id),
      );
      if (!exists) base.edges.push({ source: node.id, target: other });
    });

  return base;
}

function multiCluster(name: string): Case {
  const a = hub("a", 2, 3);
  const b = hub("b", 1, 4);
  const c = hub("c", 3, 2);

  const rename = (testCase: Case, prefix: string): Case => ({
    name,
    nodes: testCase.nodes.map((node) => ({
      ...node,
      id: `${prefix}${node.id}`,
    })),
    edges: testCase.edges.map((edge) => ({
      source: `${prefix}${edge.source}`,
      target: `${prefix}${edge.target}`,
    })),
  });

  const parts = [rename(a, "a-"), rename(b, "b-"), rename(c, "c-")];

  return {
    name,
    nodes: parts.flatMap((part) => part.nodes),
    edges: parts.flatMap((part) => part.edges),
  };
}

const cases: Case[] = [
  hub("single pair", 1, 1),
  hub("one concept, six content", 1, 6),
  hub("chain of 3 concepts", 3, 3),
  hub("chain of 6 concepts", 6, 4),
  hub("hub heavy (2 concepts, 9 content each)", 2, 9),
  shared("shared content (4 concepts)", 4, 4),
  shared("shared content (7 concepts)", 7, 5),
  hub("large map (10 concepts)", 10, 5),
  multiCluster("three separate clusters"),
  {
    name: "lone content",
    nodes: [
      { id: "a", type: "content" },
      { id: "b", type: "content" },
    ],
    edges: [],
  },
];

type Vec = [number, number];

/** Densely samples whatever the router produced: M / L / Q sequences. */
function samplePath(path: string, perSegment = 160): Vec[] {
  const tokens = path.trim().split(/\s+/);
  const pair = (token: string): Vec => {
    const [x, y] = token.split(",").map(Number);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`bad coordinate "${token}" in ${path}`);
    }
    return [x, y];
  };

  const points: Vec[] = [];
  let cursor: Vec = [0, 0];
  let i = 0;

  while (i < tokens.length) {
    const command = tokens[i];
    i += 1;

    if (command === "M") {
      cursor = pair(tokens[i]);
      i += 1;
      points.push(cursor);
      continue;
    }

    if (command === "L") {
      const end = pair(tokens[i]);
      i += 1;
      for (let step = 1; step <= perSegment; step += 1) {
        const t = step / perSegment;
        points.push([
          cursor[0] + (end[0] - cursor[0]) * t,
          cursor[1] + (end[1] - cursor[1]) * t,
        ]);
      }
      cursor = end;
      continue;
    }

    if (command === "Q") {
      const control = pair(tokens[i]);
      const end = pair(tokens[i + 1]);
      i += 2;
      for (let step = 1; step <= perSegment; step += 1) {
        const t = step / perSegment;
        const inv = 1 - t;
        points.push([
          inv * inv * cursor[0] + 2 * inv * t * control[0] + t * t * end[0],
          inv * inv * cursor[1] + 2 * inv * t * control[1] + t * t * end[1],
        ]);
      }
      cursor = end;
      continue;
    }

    throw new Error(`unexpected path token "${command}" in ${path}`);
  }

  return points;
}

function shuffle<T>(items: T[], seed: number): T[] {
  const copy = [...items];
  let state = seed;

  for (let i = copy.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function rectsFor(testCase: Case, positions: Map<string, { x: number; y: number }>) {
  return testCase.nodes.map<Rect>((node) => {
    const point = positions.get(node.id)!;
    return {
      id: node.id,
      x: point.x,
      y: point.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });
}

let failures = 0;
const previews: string[] = [];

for (const testCase of cases) {
  const problems: string[] = [];
  const started = performance.now();

  const positions = clusterLayout(testCase.nodes, testCase.edges);
  const elapsed = performance.now() - started;

  // 1. the same graph, described in any order, must lay out identically
  for (const seed of [7, 99, 12345]) {
    const reordered = clusterLayout(
      shuffle(testCase.nodes, seed),
      shuffle(testCase.edges, seed * 3),
    );

    for (const node of testCase.nodes) {
      const a = positions.get(node.id)!;
      const b = reordered.get(node.id)!;
      if (a.x !== b.x || a.y !== b.y) {
        problems.push(`not deterministic: ${node.id} moved with input order`);
        break;
      }
    }
  }

  // 2. no two cards may overlap
  const rects = rectsFor(testCase, positions);

  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const apart =
        a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y;
      if (!apart) problems.push(`overlap: ${a.id} and ${b.id}`);
    }
  }

  // 3. no connection may pass through a card it is not attached to
  const edgesWithIds = testCase.edges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    type: "relationship" as const,
  }));

  const routes = routeEdges(rects, edgesWithIds);

  for (const edge of edgesWithIds) {
    const route = routes.get(edge.id);
    if (!route) {
      problems.push(`${edge.id}: no route`);
      continue;
    }

    for (const [px, py] of samplePath(route.path)) {
      const hit = rects.find(
        (rect) =>
          rect.id !== edge.source &&
          rect.id !== edge.target &&
          px > rect.x &&
          px < rect.x + rect.width &&
          py > rect.y &&
          py < rect.y + rect.height,
      );

      if (hit) {
        problems.push(`${edge.source} -> ${edge.target} crosses ${hit.id}`);
        break;
      }
    }
  }

  const bounds = rects.reduce(
    (acc, rect) => ({
      minX: Math.min(acc.minX, rect.x),
      minY: Math.min(acc.minY, rect.y),
      maxX: Math.max(acc.maxX, rect.x + rect.width),
      maxY: Math.max(acc.maxY, rect.y + rect.height),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
  const aspect = (bounds.maxX - bounds.minX) / (bounds.maxY - bounds.minY);

  const unique = [...new Set(problems)];
  if (unique.length > 0) failures += 1;

  console.log(
    `${unique.length === 0 ? "PASS" : "FAIL"}  ${testCase.name}: ${
      rects.length
    } cards, ${edgesWithIds.length} links, aspect=${aspect.toFixed(
      2,
    )}, ${elapsed.toFixed(0)}ms`,
  );

  for (const problem of unique.slice(0, 6)) console.log(`        ${problem}`);

  previews.push(renderPreview(testCase.name, rects, edgesWithIds, routes));
}

function renderPreview(
  title: string,
  rects: Rect[],
  edges: { id: string; source: string; target: string }[],
  routes: Map<string, { path: string; labelX: number; labelY: number }>,
) {
  const pad = 90;
  const minX = Math.min(...rects.map((r) => r.x)) - pad;
  const minY = Math.min(...rects.map((r) => r.y)) - pad;
  const maxX = Math.max(...rects.map((r) => r.x + r.width)) + pad;
  const maxY = Math.max(...rects.map((r) => r.y + r.height)) + pad;

  const paths = edges
    .map((edge) => {
      const route = routes.get(edge.id);
      if (!route) return "";
      return `<path d="${route.path}" fill="none" stroke="#6f7d86" stroke-width="3" />`;
    })
    .join("");

  const cards = rects
    .map((rect) => {
      const concept = rect.id.startsWith("concept") || rect.id.includes("concept");
      const fill = concept ? "#2b2f3d" : "#22242c";
      const accent = concept ? "#c9a227" : "#5b8fb9";
      return `<g>
        <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="16" fill="${fill}" stroke="${accent}" stroke-width="2.5" />
        <text x="${rect.x + 16}" y="${rect.y + 34}" font-family="ui-sans-serif, sans-serif" font-size="19" fill="#e8e6e1">${rect.id}</text>
      </g>`;
    })
    .join("");

  return `<figure style="margin:0 0 34px">
    <figcaption style="font:600 15px ui-sans-serif,sans-serif;color:#e8e6e1;padding:8px 0">${title} — ${rects.length} cards, ${edges.length} links</figcaption>
    <svg viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="1180" style="background:#14151a;border-radius:12px;display:block">
      ${paths}${cards}
    </svg>
  </figure>`;
}

mkdirSync("layout-preview", { recursive: true });

previews.forEach((preview, index) => {
  const slug = cases[index].name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  writeFileSync(
    `layout-preview/${slug}.html`,
    `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:14px;background:#0b0c0f">${preview}</body>`,
  );
});

console.log(
  failures === 0
    ? "\nAll checks passed. Previews written to layout-preview/"
    : `\n${failures} case(s) failed.`,
);
