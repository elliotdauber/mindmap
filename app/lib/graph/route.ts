import type { EdgeRoute, GraphEdge } from "@/lib/types/graph";

export type Rect = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = { x: number; y: number };

/** How far a line must stay clear of any card it is not attached to. */
const CLEARANCE = 12;
/** Visual breathing room between a card's border and the line's endpoint. */
const EXIT_GAP = 5;
/** Samples used when checking a curved span for collisions. */
const CURVE_SAMPLES = 40;

/**
 * Sideways bows tried before falling back to path-finding, smallest first, so
 * a line only bends as much as it needs to in order to miss what's in its way.
 */
const BOWS = [0, 38, -38, 80, -80, 132, -132, 192, -192, 260, -260];

/**
 * Path-finding grid resolution and the room it leaves around the web. Cells are
 * marked blocked if a card touches them at all, so the cell must stay well
 * under the gap the layout keeps between cards or corridors vanish.
 */
const CELL = 14;
const GRID_MARGIN = 320;
const CORNER_RADIUS = 14;
/** Below this gap between border attachment points, the line needs a sideways bow. */
const MIN_ENDPOINT_SPAN = 18;

function centre(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** Point where a ray from the card's centre toward `toward` leaves its border. */
function borderPoint(rect: Rect, toward: Point): Point {
  const origin = centre(rect);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;

  if (dx === 0 && dy === 0) {
    return { x: origin.x + rect.width / 2 + EXIT_GAP, y: origin.y };
  }

  const scaleX = dx === 0 ? Infinity : rect.width / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : rect.height / 2 / Math.abs(dy);
  const edgeScale = Math.min(scaleX, scaleY);
  const gapScale = EXIT_GAP / Math.hypot(dx, dy);

  return {
    x: origin.x + dx * (edgeScale + gapScale),
    y: origin.y + dy * (edgeScale + gapScale),
  };
}

function quadraticPoint(a: Point, control: Point, b: Point, t: number): Point {
  const inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * control.x + t * t * b.x,
    y: inv * inv * a.y + 2 * inv * t * control.y + t * t * b.y,
  };
}

function containsPoint(rect: Rect, point: Point, margin: number) {
  return (
    point.x > rect.x - margin &&
    point.x < rect.x + rect.width + margin &&
    point.y > rect.y - margin &&
    point.y < rect.y + rect.height + margin
  );
}

/** Exact segment-versus-rectangle test (Liang-Barsky clipping). */
function segmentHitsRect(a: Point, b: Point, rect: Rect, margin: number) {
  const minX = rect.x - margin;
  const maxX = rect.x + rect.width + margin;
  const minY = rect.y - margin;
  const maxY = rect.y + rect.height + margin;

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  let enter = 0;
  let exit = 1;

  const slabs: [number, number][] = [
    [-dx, a.x - minX],
    [dx, maxX - a.x],
    [-dy, a.y - minY],
    [dy, maxY - a.y],
  ];

  for (const [p, q] of slabs) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }

    const t = q / p;

    if (p < 0) {
      if (t > exit) return false;
      if (t > enter) enter = t;
    } else {
      if (t < enter) return false;
      if (t < exit) exit = t;
    }
  }

  return true;
}

function segmentIsClear(a: Point, b: Point, obstacles: Rect[]) {
  for (const obstacle of obstacles) {
    if (segmentHitsRect(a, b, obstacle, CLEARANCE)) return false;
  }
  return true;
}

function curveIsClear(a: Point, control: Point, b: Point, obstacles: Rect[]) {
  for (let step = 0; step <= CURVE_SAMPLES; step += 1) {
    const point = quadraticPoint(a, control, b, step / CURVE_SAMPLES);

    for (const obstacle of obstacles) {
      if (containsPoint(obstacle, point, CLEARANCE)) return false;
    }
  }

  return true;
}

/**
 * Occupancy grid shared by every edge in a layout pass. Cards are separated by
 * more than twice the clearance, so an inflated card can only ever claim a cell
 * on its own — one owner per cell is enough.
 */
type Grid = {
  originX: number;
  originY: number;
  cols: number;
  rows: number;
  owner: Int32Array;
};

function buildGrid(rects: Rect[]): Grid {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  const originX = minX - GRID_MARGIN;
  const originY = minY - GRID_MARGIN;
  const cols = Math.max(1, Math.ceil((maxX + GRID_MARGIN - originX) / CELL));
  const rows = Math.max(1, Math.ceil((maxY + GRID_MARGIN - originY) / CELL));

  const owner = new Int32Array(cols * rows).fill(-1);

  rects.forEach((rect, index) => {
    const startCol = Math.max(
      0,
      Math.floor((rect.x - CLEARANCE - originX) / CELL),
    );
    const endCol = Math.min(
      cols - 1,
      Math.ceil((rect.x + rect.width + CLEARANCE - originX) / CELL),
    );
    const startRow = Math.max(
      0,
      Math.floor((rect.y - CLEARANCE - originY) / CELL),
    );
    const endRow = Math.min(
      rows - 1,
      Math.ceil((rect.y + rect.height + CLEARANCE - originY) / CELL),
    );

    for (let row = startRow; row <= endRow; row += 1) {
      for (let col = startCol; col <= endCol; col += 1) {
        owner[row * cols + col] = index;
      }
    }
  });

  return { originX, originY, cols, rows, owner };
}

function cellCentre(grid: Grid, col: number, row: number): Point {
  return {
    x: grid.originX + (col + 0.5) * CELL,
    y: grid.originY + (row + 0.5) * CELL,
  };
}

function cellAt(grid: Grid, point: Point) {
  return {
    col: Math.min(
      grid.cols - 1,
      Math.max(0, Math.floor((point.x - grid.originX) / CELL)),
    ),
    row: Math.min(
      grid.rows - 1,
      Math.max(0, Math.floor((point.y - grid.originY) / CELL)),
    ),
  };
}

const NEIGHBOURS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** A* across the free cells, allowing only the two attached cards to be entered. */
function findPath(
  grid: Grid,
  from: Point,
  to: Point,
  sourceIndex: number,
  targetIndex: number,
): Point[] | null {
  const { cols, rows, owner } = grid;
  const total = cols * rows;

  const passable = (index: number) => {
    const claim = owner[index];
    return claim === -1 || claim === sourceIndex || claim === targetIndex;
  };

  const start = cellAt(grid, from);
  const goal = cellAt(grid, to);
  const startIndex = start.row * cols + start.col;
  const goalIndex = goal.row * cols + goal.col;

  if (!passable(startIndex) || !passable(goalIndex)) return null;

  const cost = new Float64Array(total).fill(Infinity);
  const cameFrom = new Int32Array(total).fill(-1);
  const closed = new Uint8Array(total);

  const heuristic = (index: number) => {
    const col = index % cols;
    const row = (index - col) / cols;
    return Math.hypot(col - goal.col, row - goal.row);
  };

  cost[startIndex] = 0;

  // Binary heap keyed on cost + heuristic.
  const heap: number[] = [startIndex];
  const priority = new Float64Array(total);
  priority[startIndex] = heuristic(startIndex);

  const push = (index: number) => {
    heap.push(index);
    let child = heap.length - 1;

    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (priority[heap[parent]] <= priority[heap[child]]) break;
      [heap[parent], heap[child]] = [heap[child], heap[parent]];
      child = parent;
    }
  };

  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;

    if (heap.length > 0) {
      heap[0] = last;
      let parent = 0;

      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;

        if (left < heap.length && priority[heap[left]] < priority[heap[smallest]]) {
          smallest = left;
        }
        if (right < heap.length && priority[heap[right]] < priority[heap[smallest]]) {
          smallest = right;
        }
        if (smallest === parent) break;

        [heap[parent], heap[smallest]] = [heap[smallest], heap[parent]];
        parent = smallest;
      }
    }

    return top;
  };

  while (heap.length > 0) {
    const current = pop();
    if (closed[current]) continue;
    closed[current] = 1;

    if (current === goalIndex) break;

    const col = current % cols;
    const row = (current - col) / cols;

    for (const [dc, dr, stepCost] of NEIGHBOURS) {
      const nextCol = col + dc;
      const nextRow = row + dr;

      if (nextCol < 0 || nextCol >= cols || nextRow < 0 || nextRow >= rows) {
        continue;
      }

      const next = nextRow * cols + nextCol;
      if (closed[next] || !passable(next)) continue;

      // Refuse to slip through the diagonal gap between two blocked cells.
      if (dc !== 0 && dr !== 0) {
        if (!passable(row * cols + nextCol) || !passable(nextRow * cols + col)) {
          continue;
        }
      }

      const tentative = cost[current] + stepCost;
      if (tentative >= cost[next]) continue;

      cost[next] = tentative;
      cameFrom[next] = current;
      priority[next] = tentative + heuristic(next);
      push(next);
    }
  }

  if (cameFrom[goalIndex] === -1 && goalIndex !== startIndex) return null;

  const path: Point[] = [];
  let cursor = goalIndex;

  while (cursor !== -1) {
    const col = cursor % cols;
    const row = (cursor - col) / cols;
    path.push(cellCentre(grid, col, row));
    if (cursor === startIndex) break;
    cursor = cameFrom[cursor];
  }

  return path.reverse();
}

/** Pulls a grid path taut by skipping every waypoint we can see past. */
function tighten(points: Point[], obstacles: Rect[]): Point[] {
  if (points.length <= 2) return points;

  const result: Point[] = [points[0]];
  let anchor = 0;

  while (anchor < points.length - 1) {
    let furthest = anchor + 1;

    for (let candidate = points.length - 1; candidate > anchor; candidate -= 1) {
      if (segmentIsClear(points[anchor], points[candidate], obstacles)) {
        furthest = candidate;
        break;
      }
    }

    result.push(points[furthest]);
    anchor = furthest;
  }

  return result;
}

function polylinePath(points: Point[]) {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x},${point.y}` : `L ${point.x},${point.y}`,
    )
    .join(" ");
}

/** Same polyline, with the corners eased off so it reads as a drawn curve. */
function roundedPath(points: Point[]) {
  if (points.length < 3) return polylinePath(points);

  let path = `M ${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y) || 1;
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y) || 1;
    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2);

    const enter = {
      x: corner.x - ((corner.x - previous.x) / inLength) * radius,
      y: corner.y - ((corner.y - previous.y) / inLength) * radius,
    };
    const leave = {
      x: corner.x + ((next.x - corner.x) / outLength) * radius,
      y: corner.y + ((next.y - corner.y) / outLength) * radius,
    };

    path += ` L ${enter.x},${enter.y} Q ${corner.x},${corner.y} ${leave.x},${leave.y}`;
  }

  const end = points[points.length - 1];
  path += ` L ${end.x},${end.y}`;

  return path;
}

function roundedPathIsClear(points: Point[], obstacles: Rect[]) {
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y) || 1;
    const outLength = Math.hypot(next.x - corner.x, next.y - corner.y) || 1;
    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2);

    const enter = {
      x: corner.x - ((corner.x - previous.x) / inLength) * radius,
      y: corner.y - ((corner.y - previous.y) / inLength) * radius,
    };
    const leave = {
      x: corner.x + ((next.x - corner.x) / outLength) * radius,
      y: corner.y + ((next.y - corner.y) / outLength) * radius,
    };

    if (!curveIsClear(enter, corner, leave, obstacles)) return false;
  }

  return true;
}

function midpointOf(points: Point[]): Point {
  let total = 0;
  const spans: number[] = [];

  for (let i = 1; i < points.length; i += 1) {
    const span = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    spans.push(span);
    total += span;
  }

  let travelled = 0;

  for (let i = 0; i < spans.length; i += 1) {
    if (travelled + spans[i] >= total / 2) {
      const remaining = (total / 2 - travelled) / (spans[i] || 1);
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * remaining,
        y: points[i].y + (points[i + 1].y - points[i].y) * remaining,
      };
    }
    travelled += spans[i];
  }

  return points[Math.floor(points.length / 2)];
}

function endpointDistance(source: Rect, target: Rect) {
  const a = borderPoint(source, centre(target));
  const b = borderPoint(target, centre(source));
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * When two cards nearly touch, a straight connector collapses to a dot. Route
 * through a sideways waypoint so the link is always drawable.
 */
function visibleArcRoute(source: Rect, target: Rect): EdgeRoute {
  const from = centre(source);
  const to = centre(target);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;

  const lateral = Math.max(56, Math.min(110, length * 0.35 + 44));

  const waypoint = {
    x: (from.x + to.x) / 2 + perpX * lateral,
    y: (from.y + to.y) / 2 + perpY * lateral,
  };

  const a = borderPoint(source, waypoint);
  const b = borderPoint(target, waypoint);
  const span = Math.hypot(b.x - a.x, b.y - a.y);

  if (span < MIN_ENDPOINT_SPAN) {
    const points = [a, waypoint, b];
    return {
      path: roundedPath(points),
      labelX: waypoint.x,
      labelY: waypoint.y,
      short: true,
    };
  }

  const control = {
    x: waypoint.x * 2 - (a.x + b.x) / 2,
    y: waypoint.y * 2 - (a.y + b.y) / 2,
  };
  const midpoint = quadraticPoint(a, control, b, 0.5);

  return {
    path: `M ${a.x},${a.y} Q ${control.x},${control.y} ${b.x},${b.y}`,
    labelX: midpoint.x,
    labelY: midpoint.y,
    short: true,
  };
}

function finishRoute(
  source: Rect,
  target: Rect,
  route: EdgeRoute,
): EdgeRoute {
  if (endpointDistance(source, target) < MIN_ENDPOINT_SPAN) {
    return visibleArcRoute(source, target);
  }
  return route;
}

function directRoute(
  source: Rect,
  target: Rect,
  obstacles: Rect[],
): EdgeRoute | null {
  const from = centre(source);
  const to = centre(target);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  const perpX = -dy / length;
  const perpY = dx / length;

  for (const bow of BOWS) {
    const waypoint = {
      x: (from.x + to.x) / 2 + perpX * bow,
      y: (from.y + to.y) / 2 + perpY * bow,
    };

    const a = borderPoint(source, waypoint);
    const b = borderPoint(target, waypoint);

    if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_ENDPOINT_SPAN) continue;

    // Control point chosen so the curve actually passes through `waypoint`.
    const control = {
      x: waypoint.x * 2 - (a.x + b.x) / 2,
      y: waypoint.y * 2 - (a.y + b.y) / 2,
    };

    if (!curveIsClear(a, control, b, obstacles)) continue;

    const midpoint = quadraticPoint(a, control, b, 0.5);

    return {
      path: `M ${a.x},${a.y} Q ${control.x},${control.y} ${b.x},${b.y}`,
      labelX: midpoint.x,
      labelY: midpoint.y,
    };
  }

  return null;
}

function navigatedRoute(
  grid: Grid,
  source: Rect,
  target: Rect,
  sourceIndex: number,
  targetIndex: number,
  obstacles: Rect[],
): EdgeRoute | null {
  const found = findPath(
    grid,
    centre(source),
    centre(target),
    sourceIndex,
    targetIndex,
  );

  if (!found || found.length === 0) return null;

  // Drop the leg buried inside each card, then re-attach to their borders.
  const outside = found.filter(
    (point) =>
      !containsPoint(source, point, EXIT_GAP) &&
      !containsPoint(target, point, EXIT_GAP),
  );

  const waypoints =
    outside.length > 0
      ? outside
      : [{ x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 }];

  const taut = tighten(waypoints, obstacles);

  const start = borderPoint(source, taut[0]);
  const end = borderPoint(target, taut[taut.length - 1]);
  const full = tighten([start, ...taut, end], obstacles);

  for (let i = 1; i < full.length; i += 1) {
    if (!segmentIsClear(full[i - 1], full[i], obstacles)) return null;
  }

  const midpoint = midpointOf(full);

  return {
    path: roundedPathIsClear(full, obstacles)
      ? roundedPath(full)
      : polylinePath(full),
    labelX: midpoint.x,
    labelY: midpoint.y,
  };
}

/** Last resort: a straight line, used only when nothing else can be found. */
function straightRoute(source: Rect, target: Rect): EdgeRoute {
  const a = borderPoint(source, centre(target));
  const b = borderPoint(target, centre(source));

  return {
    path: `M ${a.x},${a.y} L ${b.x},${b.y}`,
    labelX: (a.x + b.x) / 2,
    labelY: (a.y + b.y) / 2,
  };
}

export function routeEdges(
  rects: Rect[],
  edges: GraphEdge[],
): Map<string, EdgeRoute> {
  const routes = new Map<string, EdgeRoute>();
  if (rects.length === 0) return routes;

  const indexById = new Map(rects.map((rect, index) => [rect.id, index]));
  const grid = buildGrid(rects);

  for (const edge of edges) {
    const sourceIndex = indexById.get(edge.source);
    const targetIndex = indexById.get(edge.target);
    if (sourceIndex === undefined || targetIndex === undefined) continue;

    const source = rects[sourceIndex];
    const target = rects[targetIndex];
    const obstacles = rects.filter(
      (_, index) => index !== sourceIndex && index !== targetIndex,
    );

    const route =
      directRoute(source, target, obstacles) ??
      navigatedRoute(grid, source, target, sourceIndex, targetIndex, obstacles) ??
      straightRoute(source, target);

    routes.set(edge.id, finishRoute(source, target, route));
  }

  return routes;
}
