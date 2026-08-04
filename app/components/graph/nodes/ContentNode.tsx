"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useGraph } from "../graph-context";
import { EditableField, NodeChrome } from "./NodeChrome";

type ContentNodeData = {
  title: string;
  body?: string;
};

export default function ContentNode({ id, data }: NodeProps) {
  const { updateNode } = useGraph();
  const nodeData = data as ContentNodeData;

  return (
    <NodeChrome id={id}>
      <div className="w-64 rounded-3xl border border-stone-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)]">
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-stone-400"
        />

        <EditableField
          value={nodeData.title}
          onSave={(title) => void updateNode(id, { title })}
          className="text-lg font-semibold text-stone-800"
          placeholder="Untitled note"
        />

        <EditableField
          value={nodeData.body ?? ""}
          onSave={(body) => void updateNode(id, { body })}
          multiline
          className="mt-3 text-sm text-stone-500"
          placeholder="Start writing…"
        />

        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-stone-400"
        />
      </div>
    </NodeChrome>
  );
}
