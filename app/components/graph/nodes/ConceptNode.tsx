"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useGraph } from "../graph-context";
import { EditableField, NodeChrome } from "./NodeChrome";

type ConceptNodeData = {
  title: string;
};

export default function ConceptNode({ id, data }: NodeProps) {
  const { updateNode } = useGraph();
  const nodeData = data as ConceptNodeData;

  return (
    <NodeChrome id={id}>
      <div className="min-w-[120px] rounded-full border border-orange-200/80 bg-orange-50 px-6 py-3 text-orange-900 shadow-[0_4px_16px_rgba(251,146,60,0.15)]">
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-white !bg-orange-400"
        />

        <EditableField
          value={nodeData.title}
          onSave={(title) => void updateNode(id, { title })}
          className="font-medium"
          placeholder="New concept"
        />

        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !border-2 !border-white !bg-orange-400"
        />
      </div>
    </NodeChrome>
  );
}
