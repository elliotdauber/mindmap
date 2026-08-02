"use client";

import { Handle, Position, NodeProps } from "@xyflow/react";

type NodeData = {
  title: string;
  content: string;
};

export default function ContentNode({
  data,
}: NodeProps<NodeData>) {
  return (
    <div
      className="
        w-64
        rounded-xl
        border
        border-zinc-700
        bg-zinc-900
        p-4
        text-white
        shadow-xl
      "
    >
      <Handle type="target" position={Position.Top} />

      <h2 className="font-bold text-lg">
        {data.title}
      </h2>

      <p className="mt-2 text-sm text-zinc-400">
        {data.content}
      </p>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}