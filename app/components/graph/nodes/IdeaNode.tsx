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
    label: "Content",
    accent: "var(--content)",
    untitled: "Untitled content",
    empty: "No details yet",
  },
  concept: {
    label: "Concept",
    accent: "var(--concept)",
    untitled: "Untitled concept",
    empty: "No description yet",
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
      style={{ "--accent": accent } as CSSProperties}
      onDoubleClick={() => open(id)}
    >
      <div
        className="node-card flex flex-col"
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      >
        <NodeHandles />

        <div className="flex items-center justify-between gap-2 px-3.5 pt-3">
          <span
            className="flex items-center gap-1.5 text-[9.5px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: accent }}
          >
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: accent }}
            />
            {label}
          </span>

          <div
            className={`flex items-center gap-0.5 transition-opacity duration-200 ${
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
                className="nodrag rounded-md px-2 py-1 text-[11px] font-medium text-[var(--concept)] transition-colors hover:bg-[var(--concept)]/12"
              >
                Cancel
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
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </IconButton>
                <IconButton label="Open" onClick={() => open(id)}>
                  <path
                    d="M6.4 3.6h-2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1v-2M9.2 3.6h3.2v3.2M12.4 3.6L7.6 8.4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </IconButton>
              </>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 px-3.5 pt-1 pb-3.5">
          <p
            className={`line-clamp-2 text-[14.5px] leading-snug font-semibold tracking-[-0.01em] ${
              title ? "text-[#f2f1ee]" : "text-[#6f6d69] italic"
            }`}
          >
            {title || untitled}
          </p>
          <p
            className={`mt-1 line-clamp-2 text-[12px] leading-relaxed ${
              body ? "text-[#a3a19c]" : "text-[#5f5d5a]"
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
      className="nodrag flex h-6 w-6 items-center justify-center rounded-md text-[#8d8b86] transition-colors hover:bg-white/8 hover:text-[#f2f1ee] disabled:opacity-30"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
