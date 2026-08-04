"use client";

import { useEffect, useRef, useState } from "react";
import { useGraph } from "../graph-context";

type NodeChromeProps = {
  id: string;
  children: React.ReactNode;
};

export function NodeChrome({ id, children }: NodeChromeProps) {
  const { deleteNode } = useGraph();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative">
      <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {confirmDelete ? (
          <div className="flex items-center gap-1 rounded-full border border-red-200 bg-white px-2 py-1 shadow-sm">
            <button
              type="button"
              onClick={() => void deleteNode(id)}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200/80 bg-white text-stone-400 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title="Delete"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path
                d="M2.5 3h7M4.5 3V2a1 1 0 011-1h1a1 1 0 011 1v1m1.5 0v6a1 1 0 01-1 1h-3a1 1 0 01-1-1V3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {children}
    </div>
  );
}

type EditableFieldProps = {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
};

export function EditableField({
  value,
  onSave,
  multiline = false,
  className = "",
  placeholder,
}: EditableFieldProps) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function save() {
    setEditing(false);
    if (draft.trim() !== value) {
      onSave(draft.trim());
    }
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    const shared =
      "w-full rounded-lg border border-stone-200 bg-stone-50/80 px-2 py-1 text-inherit outline-none focus:border-stone-300 focus:ring-2 focus:ring-stone-200/60";

    if (multiline) {
      return (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
          rows={3}
          className={`${shared} resize-none ${className}`}
          placeholder={placeholder}
        />
      );
    }

    return (
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        className={`${shared} ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setEditing(true);
      }}
      className={`cursor-text ${className}`}
    >
      {value || placeholder}
    </div>
  );
}
