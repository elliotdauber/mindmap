"use client";

import { Handle, Position } from "@xyflow/react";

const hidden =
  "!pointer-events-none !h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent !opacity-0";

export function NodeHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className={`${hidden} !left-0`}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={`${hidden} !right-0`}
      />
    </>
  );
}
