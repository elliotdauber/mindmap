"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { useCallback, useEffect } from "react";

import ConceptNode from "./nodes/ConceptNode";
import ContentNode from "./nodes/ContentNode";
import RelationshipEdge from "./edges/RelationshipEdge";
import { NodeEditor } from "./NodeEditor";
import { GraphProvider, useGraph } from "./graph-context";
import LogoutButton from "@/components/auth/LogoutButton";
import type { DbEdge, DbNode, NodeType } from "@/lib/types/graph";

const nodeTypes = {
  content: ContentNode,
  concept: ConceptNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

const defaultEdgeOptions = { type: "relationship" as const };

type GraphCanvasProps = {
  initialNodes: DbNode[];
  initialEdges: DbEdge[];
  userEmail: string;
};

function Wordmark() {
  const { nodeCount, edgeCount } = useGraph();

  return (
    <div className="rise-in flex items-center gap-3">
      <div className="glass flex h-9 w-9 items-center justify-center rounded-xl">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
          <path
            d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
            stroke="#8c8a85"
            strokeWidth="1"
          />
          <circle cx="4" cy="8.5" r="2.1" fill="#a9bcff" />
          <circle cx="12.6" cy="4.6" r="2.1" fill="#f5c14e" />
          <circle cx="12.6" cy="12.4" r="2.1" fill="#5eead4" />
        </svg>
      </div>

      <div>
        <p className="font-display text-[18px] leading-none text-[#f2f1ee]">
          Mind Map
        </p>
        <p className="mt-[5px] text-[11px] leading-none tracking-wide text-[#75736f]">
          {nodeCount === 0
            ? "Empty canvas"
            : `${nodeCount} ${nodeCount === 1 ? "idea" : "ideas"} · ${edgeCount} ${
                edgeCount === 1 ? "link" : "links"
              }`}
        </p>
      </div>
    </div>
  );
}

function Account({ email }: { email: string }) {
  return (
    <div className="rise-in flex items-center gap-2">
      <span className="glass hidden rounded-xl px-3.5 py-2 text-[11.5px] text-[#a3a19c] sm:block">
        {email}
      </span>
      <LogoutButton />
    </div>
  );
}

function LinkBanner() {
  const { isLinking, cancelLink, linkSourceType } = useGraph();

  if (!isLinking) return null;

  return (
    <Panel position="top-center" className="!mt-20">
      <div className="glass fade-in flex items-center gap-3 rounded-2xl px-4 py-2.5">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--concept)]" />
        <p className="text-[12.5px] text-[#ecebe8]">
          {linkSourceType === "content"
            ? "Pick a concept to link to"
            : "Pick an idea to link to"}
        </p>
        <button
          type="button"
          onClick={cancelLink}
          className="glass-button rounded-lg px-2 py-1 text-[11px] font-medium"
        >
          Esc
        </button>
      </div>
    </Panel>
  );
}

function CommandBar() {
  const {
    addNode,
    isBusy,
    isLinking,
    selectedNodeId,
    startLink,
    hasLinkTargets,
  } = useGraph();

  const canLink = selectedNodeId !== null && hasLinkTargets(selectedNodeId);

  return (
    <Panel position="bottom-center" className="!mb-7">
      <div className="rise-in-delayed flex flex-col items-center gap-3">
        <div className="glass flex items-center gap-0.5 rounded-2xl p-1.5">
          <CommandButton
            label="Content"
            shortcut="1"
            accent="var(--content)"
            disabled={isBusy || isLinking}
            onClick={() => void addNode("content")}
          >
            <rect
              x="3.5"
              y="2.5"
              width="9"
              height="11"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M6 6.2h4M6 8.6h2.6"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
          </CommandButton>

          <CommandButton
            label="Concept"
            shortcut="2"
            accent="var(--concept)"
            disabled={isBusy || isLinking}
            onClick={() => void addNode("concept")}
          >
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.3" />
          </CommandButton>

          <div className="mx-1.5 h-9 w-px bg-white/10" />

          <CommandButton
            label="Link"
            shortcut="L"
            accent="var(--concept)"
            disabled={!canLink || isLinking}
            onClick={() => selectedNodeId && startLink(selectedNodeId)}
          >
            <circle cx="4" cy="8" r="2.1" fill="currentColor" />
            <circle cx="12" cy="8" r="2.1" fill="currentColor" />
            <path
              d="M6.1 8h3.8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </CommandButton>
        </div>

        <p className="text-[10.5px] tracking-wide text-[#66655f]">
          Double-click a card to open it · content connects through concepts
        </p>
      </div>
    </Panel>
  );
}

function CommandButton({
  label,
  shortcut,
  accent,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut: string;
  accent: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 transition-colors duration-200 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ color: accent }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          {children}
        </svg>
      </span>
      <span className="text-[13px] font-medium text-[#ecebe8]">{label}</span>
      <kbd className="rounded-[5px] bg-white/7 px-1.5 py-0.5 font-sans text-[9.5px] font-medium text-[#7c7a76]">
        {shortcut}
      </kbd>
    </button>
  );
}

function ZoomCluster() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-right" className="!m-5">
      <div className="glass rise-in-delayed flex flex-col rounded-xl p-1">
        <ZoomButton label="Zoom in" onClick={() => void zoomIn({ duration: 220 })}>
          <path
            d="M8 4.5v7M4.5 8h7"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </ZoomButton>
        <ZoomButton label="Zoom out" onClick={() => void zoomOut({ duration: 220 })}>
          <path d="M4.5 8h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </ZoomButton>
        <div className="mx-1.5 my-1 h-px bg-white/10" />
        <ZoomButton
          label="Fit to view"
          onClick={() => void fitView({ duration: 520, padding: 0.28, maxZoom: 1 })}
        >
          <path
            d="M6.2 3.5H3.5v2.7M9.8 3.5h2.7v2.7M6.2 12.5H3.5V9.8M9.8 12.5h2.7V9.8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </ZoomButton>
      </div>
    </Panel>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="glass-button flex h-8 w-8 items-center justify-center rounded-lg"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        {children}
      </svg>
    </button>
  );
}

function EmptyState() {
  const { nodeCount, addNode, isBusy } = useGraph();

  if (nodeCount > 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center">
      <div className="pointer-events-auto max-w-[26rem] px-8 text-center">
        <p className="font-display fade-in text-[30px] leading-tight text-[#f2f1ee]">
          Think in connections
        </p>
        <p className="rise-in-delayed mt-3 text-[13.5px] leading-relaxed text-[#8d8b86]">
          Add content for the things you find, concepts for the ideas behind
          them. Arrangement is handled for you — you just write and link.
        </p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void addNode("content")}
          className="glass rise-in-delayed mt-7 rounded-xl px-5 py-2.5 text-[13px] font-medium text-[#f2f1ee] transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          Add content
        </button>
      </div>
    </div>
  );
}

function InitialFit() {
  const { fitView } = useReactFlow();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ duration: 480, padding: 0.3, maxZoom: 1 });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [fitView]);

  return null;
}

function ViewportFocus() {
  const { viewportFocusId, consumeViewportFocus, nodeCount } = useGraph();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!viewportFocusId) return;

    const target = viewportFocusId;
    const timer = window.setTimeout(() => {
      if (nodeCount <= 6) {
        void fitView({ duration: 700, padding: 0.3, maxZoom: 1 });
      } else {
        void fitView({
          nodes: [{ id: target }],
          duration: 700,
          padding: 1.5,
          maxZoom: 1,
        });
      }
      consumeViewportFocus();
    }, 170);

    return () => window.clearTimeout(timer);
  }, [consumeViewportFocus, fitView, nodeCount, viewportFocusId]);

  return null;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  );
}

function Shortcuts({ onClearSelection }: { onClearSelection: () => void }) {
  const {
    addNode,
    cancelLink,
    deleteSelection,
    hasLinkTargets,
    isBusy,
    isLinking,
    open,
    openNode,
    selectedNodeId,
    startLink,
  } = useGraph();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      // The expanded editor owns the keyboard while it's open.
      if (openNode) return;

      if (event.key === "Enter" && selectedNodeId) {
        event.preventDefault();
        open(selectedNodeId);
        return;
      }

      if (event.key === "Escape") {
        if (isLinking) cancelLink();
        else onClearSelection();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (event.key === "1" && !isBusy && !isLinking) {
        event.preventDefault();
        void addNode("content");
        return;
      }

      if (event.key === "2" && !isBusy && !isLinking) {
        event.preventDefault();
        void addNode("concept");
        return;
      }

      if (
        event.key.toLowerCase() === "l" &&
        selectedNodeId &&
        !isLinking &&
        hasLinkTargets(selectedNodeId)
      ) {
        event.preventDefault();
        startLink(selectedNodeId);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    addNode,
    cancelLink,
    deleteSelection,
    hasLinkTargets,
    isBusy,
    isLinking,
    onClearSelection,
    open,
    openNode,
    selectedNodeId,
    startLink,
  ]);

  return null;
}

function GraphFlow({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onPaneClick,
  userEmail,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodeClick: (id: string) => void;
  onEdgeClick: (id: string) => void;
  onPaneClick: () => void;
  userEmail: string;
}) {
  const { isLinking, isSettling } = useGraph();

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => onNodeClick(node.id),
    [onNodeClick],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => onEdgeClick(edge.id),
    [onEdgeClick],
  );

  // Cards have fixed dimensions and positions come from the layout, so React
  // Flow never needs to report changes back.
  const noop = useCallback(() => {}, []);

  return (
    <div
      className={`canvas-shell relative h-full w-full ${
        isLinking ? "is-linking" : ""
      } ${isSettling ? "is-settling" : ""}`}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={noop}
        onEdgesChange={noop}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        edgesReconnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={26}
          size={1}
          color="rgba(255,255,255,0.075)"
        />

        <InitialFit />
        <ViewportFocus />
        <Shortcuts onClearSelection={onPaneClick} />

        <Panel position="top-left" className="!m-5">
          <Wordmark />
        </Panel>

        <Panel position="top-right" className="!m-5">
          <Account email={userEmail} />
        </Panel>

        <LinkBanner />
        <CommandBar />
        <ZoomCluster />
      </ReactFlow>

      <EmptyState />
      <NodeEditor />
    </div>
  );
}

export default function GraphCanvas({
  initialNodes,
  initialEdges,
  userEmail,
}: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphProvider initialNodes={initialNodes} initialEdges={initialEdges}>
        {(props) => <GraphFlow {...props} userEmail={userEmail} />}
      </GraphProvider>
    </ReactFlowProvider>
  );
}
