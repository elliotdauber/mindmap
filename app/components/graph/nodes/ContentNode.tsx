"use client";

import { Handle, Position } from "@xyflow/react";

export default function ContentNode({ data }: any) {
  return (
    <div className="w-64 rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-stone-300"
      />

      <div className="mb-2 text-xs text-stone-400">NOTE</div>

      <h2 className="text-lg font-semibold text-stone-800">{data.title}</h2>

      <p className="mt-3 text-sm text-stone-500">{data.body}</p>

      <Handle
        type="source"
        position={Position.Right}
        className="!bg-stone-300"
      />
    </div>
  );
}
