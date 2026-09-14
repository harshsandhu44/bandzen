/** A highlighted run of characters within one text block: `[start, end)`. */
export type Span = [number, number];

const byStart = (a: Span, b: Span) => a[0] - b[0];

/** Adds a span, merging it with any it overlaps or touches. */
export function addSpan(spans: readonly Span[], [start, end]: Span): Span[] {
  if (end <= start) return [...spans];
  let merged: Span = [start, end];
  const rest: Span[] = [];
  for (const s of spans) {
    if (s[1] < merged[0] || s[0] > merged[1]) rest.push(s);
    else merged = [Math.min(s[0], merged[0]), Math.max(s[1], merged[1])];
  }
  return [...rest, merged].sort(byStart);
}

/** Drops the span that starts at `start` — a rendered mark knows its own start. */
export function removeSpanAt(spans: readonly Span[], start: number): Span[] {
  return spans.filter((s) => s[0] !== start);
}

export type Segment = { text: string; start: number; marked: boolean };

/**
 * Cuts `text` into plain and marked runs. Spans past the end of the text
 * (stale storage after a content edit) are clipped rather than trusted.
 */
export function segments(text: string, spans: readonly Span[]): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const [s0, e0] of [...spans].sort(byStart)) {
    const s = Math.max(pos, s0);
    const e = Math.min(e0, text.length);
    if (e <= s) continue;
    if (s > pos)
      out.push({ text: text.slice(pos, s), start: pos, marked: false });
    out.push({ text: text.slice(s, e), start: s, marked: true });
    pos = e;
  }
  if (pos < text.length || out.length === 0) {
    out.push({ text: text.slice(pos), start: pos, marked: false });
  }
  return out;
}
