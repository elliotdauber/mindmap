import type { ReactNode } from "react";

/** Bold every case-insensitive occurrence of `query` inside `text`. */
export function highlightMatches(text: string, query: string): ReactNode[] {
  const needle = query.trim();
  if (!needle) return [text];

  const lower = text.toLowerCase();
  const needleLower = needle.toLowerCase();
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(needleLower, cursor);
    if (index < 0) {
      parts.push(text.slice(cursor));
      break;
    }

    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }

    parts.push(
      <strong key={key} className="font-bold text-[var(--ink)]">
        {text.slice(index, index + needle.length)}
      </strong>,
    );

    key += 1;
    cursor = index + needle.length;
  }

  return parts;
}
