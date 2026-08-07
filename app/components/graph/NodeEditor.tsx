"use client";

import { useEffect, useRef, useState } from "react";
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

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [confirming, setConfirming] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title: string; body: string } | null>(null);

  const nodeId = openNode?.id ?? null;

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

  // Save whatever is outstanding when the editor closes or the card changes.
  useEffect(() => {
    return () => {
      const changes = pending.current;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (changes && nodeId) void updateNode(nodeId, changes);
      pending.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  const queueSave = (next: { title: string; body: string }) => {
    pending.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY);
  };

  useEffect(() => {
    if (!nodeId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, nodeId]);

  if (!openNode) return null;

  const variant = LABELS[openNode.type];

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex justify-end">
      <button
        type="button"
        aria-label="Close editor"
        onClick={close}
        className="editor-scrim pointer-events-auto absolute inset-0 cursor-default"
      />

      <aside className="editor-panel pointer-events-auto relative flex h-full w-full max-w-[26rem] flex-col">
        <header className="flex items-center justify-between gap-3 px-6 pt-6 pb-4">
          <span
            className="flex items-center gap-2 text-[9.5px] font-semibold tracking-[0.16em] uppercase"
            style={{ color: variant.accent }}
          >
            <span
              className="h-[5px] w-[5px] rounded-full"
              style={{ background: variant.accent }}
            />
            {variant.label}
          </span>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="glass-button flex h-7 w-7 items-center justify-center rounded-lg"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <AutoTextarea
            ref={titleRef}
            value={title}
            onChange={(next) => {
              setTitle(next);
              queueSave({ title: next, body });
            }}
            onBlur={flush}
            placeholder={variant.titlePlaceholder}
            className="font-display w-full resize-none bg-transparent text-[25px] leading-[1.25] text-[#f4f3f0] outline-none placeholder:text-[#5f5d5a]"
          />

          <div className="my-5 h-px bg-white/8" />

          <AutoTextarea
            value={body}
            onChange={(next) => {
              setBody(next);
              queueSave({ title, body: next });
            }}
            onBlur={flush}
            placeholder={variant.bodyPlaceholder}
            minHeight={200}
            className="w-full resize-none bg-transparent text-[13.5px] leading-[1.75] text-[#c8c6c2] outline-none placeholder:text-[#5f5d5a]"
          />

          {openNodeNeighbours.length > 0 && (
            <section className="mt-8">
              <h2 className="text-[9.5px] font-semibold tracking-[0.16em] text-[#6f6d69] uppercase">
                Connected
              </h2>
              <ul className="mt-2.5 flex flex-col gap-1">
                {openNodeNeighbours.map((neighbour) => (
                  <li key={neighbour.id}>
                    <button
                      type="button"
                      onClick={() => open(neighbour.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                    >
                      <span
                        className="h-[5px] w-[5px] shrink-0 rounded-full"
                        style={{
                          background:
                            neighbour.type === "concept"
                              ? "var(--concept)"
                              : "var(--content)",
                        }}
                      />
                      <span className="truncate text-[12.5px] text-[#c8c6c2]">
                        {neighbour.title || `Untitled ${neighbour.type}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/8 px-6 py-4">
          <button
            type="button"
            disabled={!hasLinkTargets(openNode.id)}
            onClick={() => startLink(openNode.id)}
            className="glass-button rounded-xl px-3 py-2 text-[12.5px] disabled:opacity-30"
          >
            Link
          </button>

          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void deleteNode(openNode.id)}
                className="rounded-xl px-3 py-2 text-[12.5px] font-medium text-[#ff8f8f] transition-colors hover:bg-[#ff8f8f]/12"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-xl px-3 py-2 text-[12.5px] text-[#8d8b86] transition-colors hover:text-[#ecebe8]"
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-xl px-3 py-2 text-[12.5px] text-[#8d8b86] transition-colors hover:text-[#ff8f8f]"
            >
              Delete
            </button>
          )}
        </footer>
      </aside>
    </div>
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
