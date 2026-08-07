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
      <div className="sketch flex h-9 w-9 items-center justify-center">
        <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
          <path
            d="M5.6 8.5l5.4-3.2M5.6 8.5l5.4 3.2"
            stroke="var(--ink-muted)"
            strokeWidth="1.2"
          />
          <circle cx="4" cy="8.5" r="2.1" fill="var(--content-stroke)" />
          <circle cx="12.6" cy="4.6" r="2.1" fill="var(--concept-stroke)" />
          <circle cx="12.6" cy="12.4" r="2.1" fill="#12b886" />
        </svg>
      </div>

      <div>
        <p className="font-hand text-[22px] leading-none text-[var(--ink)]">
          mind map
        </p>
        <p className="mt-0.5 text-[11px] text-[var(--ink-faint)]">
          {nodeCount === 0
            ? "empty canvas"
            : `${nodeCount} ${nodeCount === 1 ? "node" : "nodes"} · ${edgeCount} ${
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
      <span className="sketch hidden px-3 py-1.5 text-[11px] text-[var(--ink-muted)] sm:block">
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
      <div className="sketch fade-in flex items-center gap-3 px-4 py-2">
        <span className="pulse-dot h-2 w-2 rounded-full bg-[var(--concept-stroke)]" />
        <p className="font-hand text-[17px] text-[var(--ink)]">
          {linkSourceType === "content"
            ? "pick a concept to link to"
            : "pick an idea to link to"}
        </p>
        <button
          type="button"
          onClick={cancelLink}
          className="sketch-btn px-2 py-0.5 text-[11px] font-medium"
        >
          esc
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
        <div className="sketch flex items-center gap-0.5 p-1.5">
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

          <div className="mx-1.5 h-9 w-px bg-[var(--stroke-light)]" />

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

        <p className="font-hand text-[14px] text-[var(--ink-faint)]">
          double-click to open · content links through concepts
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
      className="group flex items-center gap-2 px-3 py-2 transition-colors duration-150 hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-35"
    >
      <span
        className="flex h-7 w-7 items-center justify-center transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        style={{ color: accent }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          {children}
        </svg>
      </span>
      <span className="font-hand text-[16px] text-[var(--ink)]">{label}</span>
      <kbd className="rounded-sm border border-[var(--stroke-light)] px-1 py-0.5 font-sans text-[9px] text-[var(--ink-faint)]">
        {shortcut}
      </kbd>
    </button>
  );
}

function ZoomCluster() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-right" className="!m-5">
      <div className="sketch rise-in-delayed flex flex-col p-1">
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
        <div className="mx-1.5 my-1 h-px bg-[var(--stroke-light)]" />
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
      className="sketch-btn flex h-8 w-8 items-center justify-center text-[var(--ink-muted)]"
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
        <p className="font-hand fade-in text-[34px] leading-tight text-[var(--ink)]">
          think in connections
        </p>
        <p className="rise-in-delayed mt-3 text-[13px] leading-relaxed text-[var(--ink-muted)]">
          Add content for the things you find, concepts for the ideas behind
          them. The map arranges itself — you just write and link.
        </p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => void addNode("content")}
          className="sketch-btn-primary font-hand rise-in-delayed mt-7 px-5 py-2 text-[18px] disabled:opacity-50"
        >
          add content
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
  const noop = useCallback(() => { }, []);

  return (
    <div
      className={`canvas-shell relative h-full w-full ${isLinking ? "is-linking" : ""
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
          gap={20}
          size={1.2}
          color="var(--grid)"
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
