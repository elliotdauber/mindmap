"use client";

import { Handle, Position } from "@xyflow/react";

export default function ConceptNode({ data }: any) {
  return (
    <div className="rounded-full border border-orange-200 bg-orange-100 px-6 py-3 text-orange-900 shadow-sm">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-orange-300"
      />

      <span className="font-medium">{data.title}</span>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-orange-300"
      />
    </div>
  );
}
