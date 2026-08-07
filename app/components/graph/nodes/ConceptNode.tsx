"use client";

import type { NodeProps } from "@xyflow/react";
import { IdeaNode } from "./IdeaNode";

export default function ConceptNode({ id, data, selected }: NodeProps) {
  return <IdeaNode id={id} data={data} selected={selected} variant="concept" />;
}
