import type { NodeType } from "@/lib/types/graph";

/** Every card is this size, so the layout never depends on what's typed in it. */
export const NODE_WIDTH = 272;
export const NODE_HEIGHT = 132;

/** Smallest gap allowed between two cards, which also gives lines room to pass. */
const GAP_X = 68;
const GAP_Y = 56;

/**
 * Distance between successive rings of concepts. A concept's own content sits in
 * its own slice of the ring rather than between the rings, so this only has to
 * be wide enough to keep neighbouring rings apart.
 */
const RING_STEP = 450;
/** How far a concept's own content sits from it. */
const SPOKE = 310;
/** Clusters are packed with this much space between them. */
const CLUSTER_GAP = 240;
const SEPARATION_PASSES = 120;

/**
 * Rings are elliptical rather than circular: cards are far wider than they are
 * tall, so spreading sideways packs them better and suits a landscape screen.
 */
const STRETCH_X = 1.3;
const STRETCH_Y = 0.78;

function polar(radius: number, angle: number): Point {
  return {
    x: Math.cos(angle) * radius * STRETCH_X,
    y: Math.sin(angle) * radius * STRETCH_Y,
  };
}

export type Point = { x: number; y: number };

type InputNode = { id: string; type: NodeType };
type InputEdge = { source: string; target: string };

function compareIds(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Angular width a card occupies at a given distance from the hub. */
function angularWidth(radius: number) {
  const halfChord = (NODE_WIDTH + GAP_X) / 2;
  return 2 * Math.asin(Math.min(1, halfChord / Math.max(radius, halfChord)));
}

type Structure = {
  ids: string[];
  typeById: Map<string, NodeType>;
  neighbours: Map<string, string[]>;
};

/**
 * Builds a canonical view of the graph: ids sorted, duplicate and self edges
 * dropped, neighbour lists sorted. Everything downstream reads only from this,
 * so the same set of nodes and connections always lays out identically no
 * matter what order they arrived in.
 */
function canonicalise(nodes: InputNode[], edges: InputEdge[]): Structure {
  const ids = nodes.map((node) => node.id).sort(compareIds);
  const typeById = new Map(nodes.map((node) => [node.id, node.type]));
  const neighbours = new Map<string, string[]>(ids.map((id) => [id, []]));

  const seen = new Set<string>();

  for (const edge of edges) {
    if (edge.source === edge.target) continue;
    if (!neighbours.has(edge.source) || !neighbours.has(edge.target)) continue;

    const key =
      compareIds(edge.source, edge.target) < 0
        ? `${edge.source}|${edge.target}`
        : `${edge.target}|${edge.source}`;

    if (seen.has(key)) continue;
    seen.add(key);

    neighbours.get(edge.source)!.push(edge.target);
    neighbours.get(edge.target)!.push(edge.source);
  }

  for (const list of neighbours.values()) list.sort(compareIds);

  return { ids, typeById, neighbours };
}

function findClusters({ ids, neighbours }: Structure): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const id of ids) {
    if (visited.has(id)) continue;

    const cluster: string[] = [];
    const queue = [id];
    visited.add(id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      cluster.push(current);

      for (const next of neighbours.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }

    clusters.push(cluster.sort(compareIds));
  }

  return clusters;
}

/** Cards laid out in a block, used for clusters that have no concept to orbit. */
function gridPositions(ids: string[]): Map<string, Point> {
  const positions = new Map<string, Point>();
  const columns = Math.max(1, Math.ceil(Math.sqrt(ids.length)));

  ids.forEach((id, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);

    positions.set(id, {
      x: column * (NODE_WIDTH + GAP_X),
      y: row * (NODE_HEIGHT + GAP_Y),
    });
  });

  return positions;
}

/**
 * Nudges overlapping cards apart along whichever axis needs the least
 * correction. Runs in sorted order so the outcome is repeatable.
 */
function separate(ids: string[], positions: Map<string, Point>) {
  const minX = NODE_WIDTH + GAP_X;
  const minY = NODE_HEIGHT + GAP_Y;

  for (let pass = 0; pass < SEPARATION_PASSES; pass += 1) {
    let moved = false;

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = positions.get(ids[i])!;
        const b = positions.get(ids[j])!;

        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const overlapX = minX - Math.abs(dx);
        const overlapY = minY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX / minX < overlapY / minY) {
          const push = (overlapX / 2 + 0.5) * (dx < 0 ? -1 : 1);
          a.x -= push;
          b.x += push;
        } else {
          const push = (overlapY / 2 + 0.5) * (dy < 0 ? -1 : 1);
          a.y -= push;
          b.y += push;
        }

        moved = true;
      }
    }

    if (!moved) break;
  }
}

/**
 * Lays out one cluster around its own origin: the busiest concept takes the
 * middle, related concepts fan out in rings around it, and each concept's own
 * content sits in the wedge of space belonging to that concept.
 */
function layoutCluster(ids: string[], structure: Structure): Map<string, Point> {
  const { typeById, neighbours } = structure;
  const isConcept = (id: string) => typeById.get(id) === "concept";

  const concepts = ids.filter(isConcept);
  if (concepts.length === 0) return gridPositions(ids);

  const conceptsOf = (id: string) =>
    (neighbours.get(id) ?? []).filter(isConcept);

  // Two concepts are related if they're linked, or if they share a piece of
  // content — content is how concepts relate in this model.
  const conceptLinks = new Map<string, string[]>();

  for (const concept of concepts) {
    const related = new Set<string>();

    for (const neighbour of neighbours.get(concept) ?? []) {
      if (isConcept(neighbour)) {
        related.add(neighbour);
        continue;
      }

      for (const shared of conceptsOf(neighbour)) {
        if (shared !== concept) related.add(shared);
      }
    }

    conceptLinks.set(concept, [...related].sort(compareIds));
  }

  const ownContent = new Map<string, string[]>(
    concepts.map((concept) => [concept, []]),
  );
  const sharedContent: string[] = [];
  const looseContent: string[] = [];

  for (const id of ids) {
    if (isConcept(id)) continue;

    const owners = conceptsOf(id);

    if (owners.length === 1) ownContent.get(owners[0])!.push(id);
    else if (owners.length > 1) sharedContent.push(id);
    else looseContent.push(id);
  }

  const root = [...concepts].sort((a, b) => {
    const scoreA = conceptLinks.get(a)!.length + ownContent.get(a)!.length;
    const scoreB = conceptLinks.get(b)!.length + ownContent.get(b)!.length;
    return scoreB - scoreA || compareIds(a, b);
  })[0];

  // Walk the concept graph outward from the root to get rings and parentage.
  const children = new Map<string, string[]>(
    concepts.map((concept) => [concept, []]),
  );
  const visited = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;

    for (const next of conceptLinks.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      children.get(current)!.push(next);
      queue.push(next);
    }
  }

  // A concept's weight is how much room its whole branch needs.
  const weights = new Map<string, number>();

  const weigh = (concept: string): number => {
    const cached = weights.get(concept);
    if (cached !== undefined) return cached;

    weights.set(concept, 1);
    const total =
      1 +
      ownContent.get(concept)!.length +
      children.get(concept)!.reduce((sum, child) => sum + weigh(child), 0);

    weights.set(concept, total);
    return total;
  };

  concepts.forEach(weigh);

  const positions = new Map<string, Point>();

  const place = (
    concept: string,
    radius: number,
    angleStart: number,
    angleEnd: number,
  ) => {
    const angle = (angleStart + angleEnd) / 2;

    positions.set(concept, radius === 0 ? { x: 0, y: 0 } : polar(radius, angle));

    const branches = [...children.get(concept)!].sort(
      (a, b) => weigh(b) - weigh(a) || compareIds(a, b),
    );
    const leaves = ownContent.get(concept)!;

    const items = [
      ...branches.map((id) => ({ id, weight: weigh(id), branch: true })),
      ...leaves.map((id) => ({ id, weight: 1, branch: false })),
    ];

    if (items.length === 0) return;

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const span = angleEnd - angleStart;
    let cursor = angleStart;

    for (const item of items) {
      const slice = (span * item.weight) / totalWeight;

      if (item.branch) {
        place(item.id, radius + RING_STEP, cursor, cursor + slice);
      } else {
        // Keep the card inside its own slice by pushing it far enough out that
        // the slice is wide enough to hold it.
        const needed =
          (NODE_WIDTH + GAP_X) / 2 / Math.sin(Math.max(slice, 0.001) / 2);
        const distance = Math.min(
          Math.max(radius + SPOKE, needed),
          radius + SPOKE * 2.4,
        );

        positions.set(item.id, polar(distance, cursor + slice / 2));
      }

      cursor += slice;
    }
  };

  // Starting the root's full circle at due west puts a lone neighbour out to the
  // side, which suits the shape of the cards and the screen.
  place(root, 0, -Math.PI, Math.PI);

  // Content shared by several concepts belongs between them.
  for (const id of sharedContent) {
    const owners = conceptsOf(id).filter((owner) => positions.has(owner));

    if (owners.length === 0) {
      positions.set(id, { x: 0, y: 0 });
      continue;
    }

    const x =
      owners.reduce((sum, owner) => sum + positions.get(owner)!.x, 0) /
      owners.length;
    const y =
      owners.reduce((sum, owner) => sum + positions.get(owner)!.y, 0) /
      owners.length;

    positions.set(id, { x, y });
  }

  looseContent.forEach((id, index) => {
    positions.set(id, {
      x: index * (NODE_WIDTH + GAP_X),
      y: -RING_STEP,
    });
  });

  for (const id of ids) {
    if (!positions.has(id)) positions.set(id, { x: 0, y: 0 });
  }

  separate(ids, positions);

  return positions;
}

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

function boundsOf(ids: string[], positions: Map<string, Point>): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const id of ids) {
    const point = positions.get(id)!;
    minX = Math.min(minX, point.x - NODE_WIDTH / 2);
    minY = Math.min(minY, point.y - NODE_HEIGHT / 2);
    maxX = Math.max(maxX, point.x + NODE_WIDTH / 2);
    maxY = Math.max(maxY, point.y + NODE_HEIGHT / 2);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Positions every card as the top-left corner React Flow expects. Depends only
 * on the ids, their types and the connections between them.
 */
export function clusterLayout(
  nodes: InputNode[],
  edges: InputEdge[],
): Map<string, Point> {
  const result = new Map<string, Point>();
  if (nodes.length === 0) return result;

  const structure = canonicalise(nodes, edges);
  const clusters = findClusters(structure);

  const laid = clusters.map((ids) => {
    const positions = layoutCluster(ids, structure);
    return { ids, positions, bounds: boundsOf(ids, positions) };
  });

  // Biggest cluster first, then packed into rows roughly the shape of a screen.
  const ordered = [...laid].sort(
    (a, b) =>
      b.ids.length - a.ids.length || compareIds(a.ids[0] ?? "", b.ids[0] ?? ""),
  );

  const totalArea = ordered.reduce(
    (sum, cluster) =>
      sum +
      (cluster.bounds.maxX - cluster.bounds.minX + CLUSTER_GAP) *
        (cluster.bounds.maxY - cluster.bounds.minY + CLUSTER_GAP),
    0,
  );
  const widestCluster = ordered.reduce(
    (widest, cluster) =>
      Math.max(widest, cluster.bounds.maxX - cluster.bounds.minX),
    0,
  );
  const rowLimit = Math.max(widestCluster, Math.sqrt(totalArea * 1.7));

  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;

  for (const cluster of ordered) {
    const width = cluster.bounds.maxX - cluster.bounds.minX;
    const height = cluster.bounds.maxY - cluster.bounds.minY;

    if (cursorX > 0 && cursorX + width > rowLimit) {
      cursorX = 0;
      cursorY += rowHeight + CLUSTER_GAP;
      rowHeight = 0;
    }

    for (const id of cluster.ids) {
      const point = cluster.positions.get(id)!;

      result.set(id, {
        x: point.x - cluster.bounds.minX + cursorX,
        y: point.y - cluster.bounds.minY + cursorY,
      });
    }

    cursorX += width + CLUSTER_GAP;
    rowHeight = Math.max(rowHeight, height);
  }

  // Centre the whole map on the origin and convert centres to top-left corners.
  const overall = boundsOf(structure.ids, result);
  const shiftX = (overall.minX + overall.maxX) / 2;
  const shiftY = (overall.minY + overall.maxY) / 2;

  for (const id of structure.ids) {
    const point = result.get(id)!;
    result.set(id, {
      x: point.x - shiftX - NODE_WIDTH / 2,
      y: point.y - shiftY - NODE_HEIGHT / 2,
    });
  }

  return result;
}
