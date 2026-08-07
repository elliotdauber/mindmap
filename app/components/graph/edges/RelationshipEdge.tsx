"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { useGraph } from "../graph-context";
import type { EdgeRoute } from "@/lib/types/graph";

/** If the routed path spans less than this, fall back to React Flow's bezier. */
const MIN_VISIBLE_SPAN = 6;

function pathSpan(path: string): number {
  const numbers = path.match(/-?[\d.]+/g)?.map(Number);
  if (!numbers || numbers.length < 4) return 0;

  const startX = numbers[0];
  const startY = numbers[1];
  const endX = numbers[numbers.length - 2];
  const endY = numbers[numbers.length - 1];

  return Math.hypot(endX - startX, endY - startY);
}

export default function RelationshipEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const { deleteEdge } = useGraph();
  const route = data as EdgeRoute | undefined;

  const [fallbackPath, fallbackLabelX, fallbackLabelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  const routed = route?.path;
  const useRouted = Boolean(routed && pathSpan(routed) >= MIN_VISIBLE_SPAN);

  const path = useRouted ? routed! : fallbackPath;
  const labelX = useRouted ? route!.labelX : fallbackLabelX;
  const labelY = useRouted ? route!.labelY : fallbackLabelY;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={24}
        style={{
          stroke: selected ? "var(--edge-live)" : "var(--edge)",
          strokeWidth: selected ? 2.25 : 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
        }}
        className="edge-base"
      />

      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            onClick={(event) => {
              event.stopPropagation();
              void deleteEdge(id);
            }}
            className="sketch nodrag nopan pointer-events-auto absolute flex h-7 w-7 items-center justify-center text-[var(--ink-muted)] transition-colors hover:text-[var(--edge-live)]"
            title="Remove connection"
            aria-label="Remove connection"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
              <path
                d="M2.5 5.5h6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
