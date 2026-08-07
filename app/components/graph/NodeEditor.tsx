"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useCoarsePointer } from "@/hooks/use-coarse-pointer";
import { useGraph } from "./graph-context";

const LABELS = {
  content: {
    label: "Content",
    accent: "var(--content)",
    titlePlaceholder: "Untitled content",
    bodyPlaceholder: "Write the details…",
  },
  concept: {
    label: "Concept",
    accent: "var(--concept)",
    titlePlaceholder: "Untitled concept",
    bodyPlaceholder: "Describe this concept…",
  },
} as const;

/** Edits are saved this long after typing stops. */
const SAVE_DELAY = 500;

/**
 * The expanded view of a card. Editing happens here rather than on the card so
 * that a card's size — and with it the whole layout — never changes.
 */
export function NodeEditor() {
  const {
    openNode,
    openNodeNeighbours,
    close,
    updateNode,
    deleteNode,
    startLink,
    hasLinkTargets,
    open,
  } = useGraph();

  const isTouch = useCoarsePointer();
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title: string; body: string } | null>(null);

  const nodeId = openNode?.id ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    pending.current = null;
    close({ title, body });
  }, [body, close, title]);

  // Load the card into the form whenever a different one is opened.
  useEffect(() => {
    if (!openNode) return;

    setTitle(openNode.title);
    setBody(openNode.body);
    setConfirming(false);
    pending.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  useEffect(() => {
    if (!nodeId) return;
    titleRef.current?.focus();
    titleRef.current?.setSelectionRange(
      titleRef.current.value.length,
      titleRef.current.value.length,
    );
  }, [nodeId]);

  const flush = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }

    const changes = pending.current;
    if (!changes || !nodeId) return;

    pending.current = null;
    void updateNode(nodeId, changes);
  };

  // Save whatever is outstanding when the card changes without closing.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      pending.current = null;
    };
  }, [nodeId]);

  const queueSave = (next: { title: string; body: string }) => {
    pending.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  };

  useEffect(() => {
    if (!nodeId) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dismiss, nodeId]);

  if (!openNode || !mounted) return null;

  const variant = LABELS[openNode.type];

  return createPortal(
    <div className="editor-overlay pointer-events-none fixed inset-0 z-[90] flex justify-end">
      <button
        type="button"
        aria-label="Close editor"
        onClick={dismiss}
        className="editor-scrim pointer-events-auto absolute inset-0 cursor-default"
      />

      <aside
        className={`editor-panel pointer-events-auto relative flex h-full flex-col ${
          isTouch ? "w-full" : "w-full max-w-[26rem]"
        }`}
      >
        <header className="flex items-center justify-between gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-6 sm:pt-6">
          <span
            className="font-hand text-[18px]"
            style={{ color: variant.accent }}
          >
            {variant.label}
          </span>

          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="sketch-btn flex h-11 w-11 items-center justify-center text-[var(--ink-muted)] sm:h-7 sm:w-7"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M4.6 4.6l6.8 6.8M11.4 4.6l-6.8 6.8"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6 sm:px-6">
          <AutoTextarea
            ref={titleRef}
            value={title}
            onChange={(next) => {
              setTitle(next);
              queueSave({ title: next, body });
            }}
            onBlur={flush}
            placeholder={variant.titlePlaceholder}
            className="editor-title font-hand w-full resize-none bg-transparent text-[26px] leading-[1.2] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)] sm:text-[28px]"
          />

          <div className="my-5 h-px bg-[var(--stroke-light)]" />

          <AutoTextarea
            value={body}
            onChange={(next) => {
              setBody(next);
              queueSave({ title, body: next });
            }}
            onBlur={flush}
            placeholder={variant.bodyPlaceholder}
            minHeight={200}
            className="editor-body font-hand w-full resize-none bg-transparent text-[17px] leading-[1.65] text-[var(--ink-muted)] outline-none placeholder:text-[var(--ink-faint)]"
          />

          {openNodeNeighbours.length > 0 && (
            <section className="mt-8">
              <h2 className="font-hand text-[15px] text-[var(--ink-faint)]">
                connected
              </h2>
              <ul className="mt-2 flex flex-col gap-0.5">
                {openNodeNeighbours.map((neighbour) => (
                  <li key={neighbour.id}>
                    <button
                      type="button"
                      onClick={() => open(neighbour.id, { title, body })}
                      className="flex min-h-[2.75rem] w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-black/[0.04]"
                    >
                      <span
                        className="font-hand shrink-0 text-[13px]"
                        style={{
                          color:
                            neighbour.type === "concept"
                              ? "var(--concept-stroke)"
                              : "var(--content-stroke)",
                        }}
                      >
                        {neighbour.type === "concept" ? "○" : "□"}
                      </span>
                      <span className="font-hand truncate text-[16px] text-[var(--ink-muted)]">
                        {neighbour.title || `untitled ${neighbour.type}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t-2 border-[var(--stroke-light)] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            disabled={!hasLinkTargets(openNode.id)}
            onClick={() => startLink(openNode.id, { title, body })}
            className="sketch font-hand min-h-[2.75rem] px-4 py-2 text-[16px] text-[var(--ink)] disabled:opacity-30"
          >
            link
          </button>

          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void deleteNode(openNode.id)}
                className="font-hand min-h-[2.75rem] px-4 py-2 text-[16px] text-[var(--edge-live)]"
              >
                delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-hand min-h-[2.75rem] px-4 py-2 text-[16px] text-[var(--ink-muted)]"
              >
                keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="font-hand min-h-[2.75rem] px-4 py-2 text-[16px] text-[var(--ink-faint)] hover:text-[var(--edge-live)]"
            >
              delete
            </button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function AutoTextarea({
  ref,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  minHeight = 0,
}: {
  ref?: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder: string;
  className: string;
  minHeight?: number;
}) {
  const fallback = useRef<HTMLTextAreaElement>(null);
  const element = ref ?? fallback;

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.max(node.scrollHeight, minHeight)}px`;
  }, [element, minHeight, value]);

  return (
    <textarea
      ref={element}
      rows={1}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      className={className}
      style={{ minHeight: minHeight || undefined }}
    />
  );
}
