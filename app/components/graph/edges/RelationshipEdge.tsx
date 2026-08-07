"use client";

import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { useGraph } from "../graph-context";
import type { EdgeRoute } from "@/lib/types/graph";

export default function RelationshipEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps) {
  const { deleteEdge } = useGraph();
  const route = data as EdgeRoute | undefined;

  // The router pre-computes geometry that steers clear of every card; the
  // straight fallback only applies before the first layout pass lands.
  const path = route?.path ?? `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
  const labelX = route?.labelX ?? (sourceX + targetX) / 2;
  const labelY = route?.labelY ?? (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge id={id} path={path} interactionWidth={22} className="edge-base" />

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
            className="glass nodrag nopan pointer-events-auto absolute flex h-7 w-7 items-center justify-center rounded-full text-[#c9c7c2] transition-all hover:scale-105 hover:text-[#ff8f8f]"
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
