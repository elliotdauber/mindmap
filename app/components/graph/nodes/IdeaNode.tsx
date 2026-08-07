"use client";

import type { CSSProperties } from "react";
import { useGraph } from "../graph-context";
import { NODE_HEIGHT, NODE_WIDTH } from "../layout/clusterLayout";
import { NodeHandles } from "./NodeHandles";

export type IdeaVariant = "content" | "concept";

type IdeaNodeData = {
  title: string;
  body?: string;
};

const VARIANTS: Record<
  IdeaVariant,
  { label: string; accent: string; untitled: string; empty: string }
> = {
  content: {
    label: "content",
    accent: "var(--content)",
    untitled: "untitled content",
    empty: "…",
  },
  concept: {
    label: "concept",
    accent: "var(--concept)",
    untitled: "untitled concept",
    empty: "…",
  },
};

type IdeaNodeProps = {
  id: string;
  data: unknown;
  selected?: boolean;
  variant: IdeaVariant;
};

export function IdeaNode({ id, data, selected, variant }: IdeaNodeProps) {
  const {
    open,
    startLink,
    cancelLink,
    linkSourceId,
    isLinking,
    isLinkableTarget,
    hasLinkTargets,
  } = useGraph();

  const { label, accent, untitled, empty } = VARIANTS[variant];
  const { title, body } = data as IdeaNodeData;

  const isSource = linkSourceId === id;
  const isTarget = isLinking && !isSource && isLinkableTarget(id);
  const isBlocked = isLinking && !isSource && !isTarget;

  return (
    <div
      className={`node-shell node-enter group ${selected ? "is-selected" : ""} ${
        isSource ? "is-source" : ""
      } ${isTarget ? "is-target" : ""} ${isBlocked ? "is-blocked" : ""}`}
      data-variant={variant}
      style={{ "--accent": accent } as CSSProperties}
      onDoubleClick={() => open(id)}
    >
      <div
        className="node-card flex flex-col"
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      >
        <NodeHandles />

        <div className="flex items-center justify-between gap-2 px-3.5 pt-2.5">
          <span
            className="font-hand text-[15px] leading-none"
            style={{ color: accent }}
          >
            {label}
          </span>

          <div
            className={`flex items-center gap-0.5 transition-opacity duration-150 ${
              selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isSource ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  cancelLink();
                }}
                className="nodrag font-hand px-1.5 py-0.5 text-[14px] text-[var(--concept)]"
              >
                cancel
              </button>
            ) : (
              <>
                <IconButton
                  label={
                    hasLinkTargets(id)
                      ? "Link to another idea"
                      : "Add a concept to link this to"
                  }
                  disabled={isLinking || !hasLinkTargets(id)}
                  onClick={() => startLink(id)}
                >
                  <circle cx="4.2" cy="8" r="1.9" fill="currentColor" />
                  <circle cx="11.8" cy="8" r="1.9" fill="currentColor" />
                  <path
                    d="M6.1 8h3.8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </IconButton>
                <IconButton label="Open" onClick={() => open(id)}>
                  <path
                    d="M6.4 3.6h-2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-2M9.2 3.6h3.2v3.2M12.4 3.6L7.6 8.4"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </IconButton>
              </>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-3.5 pt-0.5 pb-3">
          <p
            className={`font-hand line-clamp-2 text-[20px] leading-[1.15] ${
              title ? "text-[var(--ink)]" : "text-[var(--ink-faint)]"
            }`}
          >
            {title || untitled}
          </p>
          <p
            className={`font-hand mt-0.5 line-clamp-2 text-[15px] leading-snug ${
              body ? "text-[var(--ink-muted)]" : "text-[var(--ink-faint)]"
            }`}
          >
            {body || empty}
          </p>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="nodrag flex h-6 w-6 items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
