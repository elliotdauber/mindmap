"use client";

import "@xyflow/react/dist/style.css";

import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  Connection,
} from "@xyflow/react";

import ContentNode from "./nodes/ContentNode";
import ConceptNode from "./nodes/ConceptNode";
import RelationshipEdge from "./edges/RelationshipEdge";
import { GraphProvider, useGraph } from "./graph-context";
import type { DbEdge, DbNode, NodeType } from "@/lib/types/graph";
import { useCallback, useState } from "react";

const nodeTypes = {
  content: ContentNode,
  concept: ConceptNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

type GraphCanvasProps = {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
};

function Toolbar() {
  const { addNode, isBusy } = useGraph();
  const [adding, setAdding] = useState<NodeType | null>(null);

  const handleAdd = useCallback(
    async (type: NodeType) => {
      setAdding(type);
      await addNode(type);
      setAdding(null);
    },
    [addNode],
  );

  return (
    <Panel position="bottom-center" className="mb-6">
      <div className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/95 p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
        <ToolbarButton
          onClick={() => void handleAdd("content")}
          disabled={isBusy}
          loading={adding === "content"}
          icon="+"
          label="Add content"
        />
        <div className="mx-0.5 h-5 w-px bg-stone-200" />
        <ToolbarButton
          onClick={() => void handleAdd("concept")}
          disabled={isBusy}
          loading={adding === "concept"}
          icon="○"
          label="Add concept"
          variant="concept"
        />
      </div>
      <p className="mt-2 text-center text-xs text-stone-400">
        Drag from a handle to connect · Click a connection to remove it
      </p>
    </Panel>
  );
}

function ToolbarButton({
  onClick,
  disabled,
  loading,
  icon,
  label,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon: string;
  label: string;
  variant?: "default" | "concept";
}) {
  const isConcept = variant === "concept";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
        isConcept
          ? "text-orange-800 hover:bg-orange-50"
          : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
          isConcept ? "bg-orange-200 text-orange-900" : "bg-stone-800 text-white"
        }`}
      >
        {loading ? (
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        ) : (
          icon
        )}
      </span>
      {loading ? "Adding…" : label}
    </button>
  );
}

function GraphFlow({
  nodes,
  edges,
  setNodes,
  setEdges,
  onEdge,
  onNodesDelete,
  onEdgesDelete,
}: {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onEdge: (edge: Connection) => void;
  onNodesDelete: (deleted: Node[]) => void;
  onEdgesDelete: (deleted: Edge[]) => void;
}) {
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onEdge}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable
        elementsSelectable
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.5}
        connectionLineStyle={{ stroke: "#a8a29e", strokeWidth: 2 }}
        defaultEdgeOptions={{ type: "relationship" }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#ddd6ce"
        />

        <MiniMap
          className="!rounded-xl !border !border-stone-200/80 !bg-white/90 !shadow-sm"
          maskColor="rgba(250, 247, 242, 0.7)"
          nodeColor={(node) =>
            node.type === "concept" ? "#fdba74" : "#a8a29e"
          }
          nodeStrokeWidth={0}
        />

        <Controls
          showInteractive={false}
          className="!rounded-xl !border !border-stone-200/80 !bg-white/90 !shadow-sm [&>button]:!border-stone-200/60 [&>button]:!bg-transparent [&>button]:!text-stone-600 [&>button:hover]:!bg-stone-100"
        />

        <Toolbar />
      </ReactFlow>
    </div>
  );
}

export default function GraphCanvas({
  initialNodes,
  initialEdges,
}: GraphCanvasProps) {
  return (
    <GraphProvider
      initialNodes={initialNodes}
      initialEdges={initialEdges}
    >
      {(props) => <GraphFlow {...props} />}
    </GraphProvider>
  );
}
