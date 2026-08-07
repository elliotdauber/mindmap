"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { highlightMatches } from "@/lib/graph/search-highlight";
import { searchNodes } from "@/lib/graph/search";
import { useGraph } from "./graph-context";

export function SearchPalette() {
  const { nodes, searchOpen, closeSearch, jumpToNode, open, isTouch } = useGraph();

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchNodes(nodes, query), [nodes, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [searchOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!searchOpen || !mounted) return null;

  function pick(id: string) {
    closeSearch();
    jumpToNode(id);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        Math.min(index + 1, Math.max(results.length - 1, 0)),
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && results[activeIndex]) {
      event.preventDefault();
      pick(results[activeIndex].id);
    }
  }

  return createPortal(
    <div className="search-overlay pointer-events-none fixed inset-0 z-[100] flex justify-center px-4 pt-[max(4.5rem,calc(4.5rem+env(safe-area-inset-top)))]">
      <button
        type="button"
        aria-label="Close search"
        onClick={closeSearch}
        className="search-scrim pointer-events-auto absolute inset-0 cursor-default"
      />

      <div
        className="search-palette pointer-events-auto relative w-[min(26rem,calc(100vw-2rem))]"
        onKeyDown={onKeyDown}
      >
        <div className="sketch overflow-visible px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search ideas…"
            aria-label="Search ideas"
            className="search-input font-hand w-full bg-transparent text-[20px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-faint)]"
          />
        </div>

        {query.trim() && (
          <div className="sketch search-results mt-2 overflow-visible">
            <ul className="search-results-scroll max-h-[min(24rem,50vh)] overflow-y-auto py-1.5">
              {results.length === 0 ? (
                <li className="px-4 py-2.5 text-[13px] text-[var(--ink-faint)]">
                  No matches
                </li>
              ) : (
                results.map((result, index) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => pick(result.id)}
                      onDoubleClick={() => {
                        closeSearch();
                        open(result.id);
                      }}
                      className={`flex min-h-[2.75rem] w-full flex-col gap-1 px-4 py-3 text-left transition-colors ${
                        index === activeIndex
                          ? "bg-black/[0.06]"
                          : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-1">
                        <span
                          className="font-hand mt-0.5 shrink-0 text-[13px] leading-none"
                          style={{
                            color:
                              result.type === "concept"
                                ? "var(--concept-stroke)"
                                : "var(--content-stroke)",
                          }}
                        >
                          {result.type}
                        </span>
                        <span className="font-hand text-[17px] leading-snug text-[var(--ink-muted)]">
                          {highlightMatches(result.title, query)}
                        </span>
                        {result.snippet && (
                          <span className="col-start-2 text-[12px] leading-snug text-[var(--ink-muted)]">
                            {highlightMatches(result.snippet, query)}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <p className="mt-2 text-center font-hand text-[13px] text-[var(--ink-faint)]">
          {isTouch ? "tap to jump" : "enter to jump · double-click to open"}
        </p>
      </div>
    </div>,
    document.body,
  );
}
