"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";

export default function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
}: any) {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: "#d6c7b8",
          strokeWidth: 2,
        }}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
            className="absolute rounded-full border border-orange-200 bg-[#fff7ed] px-3 py-1 text-xs text-orange-700"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
