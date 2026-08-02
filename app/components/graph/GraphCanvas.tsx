"use client";

import "@xyflow/react/dist/style.css";

import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from "@xyflow/react";

import { useCallback } from "react";
import ContentNode from "./ContentNode";

const nodeTypes = {
  content: ContentNode,
};

const initialNodes = [
  {
    id: "1",
    type: "content",
    position: {
      x: 100,
      y: 100,
    },
    data: {
      title: "Apple",
      content: "A sweet fruit.",
    },
  },
  {
    id: "2",
    type: "content",
    position: {
      x: 500,
      y: 250,
    },
    data: {
      title: "Fruit",
      content: "Edible plant structure.",
    },
  },
];

const initialEdges = [
  {
    id: "e1",
    source: "1",
    target: "2",
    label: "is a",
  },
];

function Flow() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            label: "relationship",
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <ReactFlow
      fitView
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
    >
      <Background gap={24} />
      <MiniMap />
      <Controls />
    </ReactFlow>
  );
}

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}