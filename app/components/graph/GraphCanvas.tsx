"use client";

import "@xyflow/react/dist/style.css";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
} from "@xyflow/react";

import ContentNode from "./nodes/ContentNode";
import ConceptNode from "./nodes/ConceptNode";
import RelationshipEdge from "./edges/RelationshipEdge";
import { autoLayout } from "./layout/autoLayout";

const nodeTypes = {
  content: ContentNode,
  concept: ConceptNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

const rawNodes = [
  {
    id: "1",
    type: "content",
    data: {
      title: "Some Book",
      body: "Book about stuff.",
    },
  },

  {
    id: "2",
    type: "content",
    data: {
      title: "Some Other Book",
      body: "Another book about stuff.",
    },
  },

  {
    id: "3",
    type: "concept",
    data: {
      title: "Some concept",
    },
  },
];

const rawEdges = [
  {
    id: "1-3",
    source: "1",
    target: "3",
    type: "relationship",
  },

  {
    id: "2-3",
    source: "2",
    target: "3",
    type: "relationship",
  },
];

const nodes = autoLayout(rawNodes, rawEdges);

export default function GraphCanvas() {
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}

        edges={rawEdges}

        nodeTypes={nodeTypes}

        edgeTypes={edgeTypes}

        nodesDraggable={false}

        nodesConnectable={false}

        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}

          gap={24}

          size={1}

          color="#ddd6ce"
        />

        <MiniMap
          nodeColor={(node) => {
            if (node.type === "concept") return "#fed7aa";

            return "#ffffff";
          }}
        />

        <Controls />
      </ReactFlow>
    </div>
  );
}
