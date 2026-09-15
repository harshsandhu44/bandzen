'use client';

import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { addSpan, removeSpanAt, segments, type Span } from '@/lib/highlights';

type Store = Record<string, Span[]>;

// Writes land in memory first, so a window that refuses localStorage still
// highlights for the life of the page.
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function read(key: string): string | null {
  if (memory.has(key)) return memory.get(key)!;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A private window that refuses storage is not worth failing over.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function parse(raw: string | null): Store {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return value && typeof value === 'object' ? (value as Store) : {};
  } catch {
    return {};
  }
}

const HighlightContext = createContext<{ store: Store; readOnly: boolean }>({
  store: {},
  readOnly: true,
});

type Pending = { top: number; left: number } & (
  | { kind: 'add'; block: string; span: Span }
  | { kind: 'remove'; block: string; start: number }
);

const blockOf = (node: Node) =>
  (node instanceof Element ? node : node.parentElement)?.closest<HTMLElement>(
    '[data-hl-block]',
  ) ?? null;

/** Characters from the start of `block` to a DOM position inside it. */
function offsetIn(block: HTMLElement, node: Node, offset: number) {
  const range = document.createRange();
  range.setStart(block, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * Candidate highlights over a Reading passage and its prompts, kept per
 * attempt in localStorage as character offsets per text block — the text is
 * plain, so offsets survive re-render and reload without serialising DOM
 * ranges. Select text inside one block → "Highlight"; click a highlight →
 * "Remove highlight". `readOnly` renders the marks (the review page) with no
 * toolbar.
 *
 * ponytail: stored attempts are never pruned; add cleanup if storage fills.
 * ponytail: making a selection needs a pointer (or caret browsing).
 */
export function HighlightProvider({
  storageKey,
  readOnly = false,
  children,
}: {
  storageKey: string;
  readOnly?: boolean;
  children: ReactNode;
}) {
  // The server snapshot is empty, so hydration matches and marks appear on
  // the client's first pass.
  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  );
  const store = useMemo(() => parse(raw), [raw]);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    if (readOnly) return;

    const at = (rect: DOMRect) => ({
      top: rect.bottom + 6,
      left: Math.min(
        Math.max(rect.left + rect.width / 2, 64),
        window.innerWidth - 64,
      ),
    });

    const onPointerUp = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('[data-hl-toolbar]')) return;

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.rangeCount) {
        // The range, not anchor/focus: a right-to-left drag inverts those.
        const range = selection.getRangeAt(0);
        const block = blockOf(range.startContainer);
        if (block && block === blockOf(range.endContainer)) {
          const start = offsetIn(
            block,
            range.startContainer,
            range.startOffset,
          );
          const end = offsetIn(block, range.endContainer, range.endOffset);
          if (end > start) {
            setPending({
              kind: 'add',
              block: block.dataset.hlBlock!,
              span: [start, end],
              ...at(range.getBoundingClientRect()),
            });
            return;
          }
        }
        setPending(null);
        return;
      }

      const mark = target?.closest<HTMLElement>('mark[data-hl-start]');
      const block = mark && blockOf(mark);
      setPending(
        mark && block
          ? {
              kind: 'remove',
              block: block.dataset.hlBlock!,
              start: Number(mark.dataset.hlStart),
              ...at(mark.getBoundingClientRect()),
            }
          : null,
      );
    };
    const hide = () => setPending(null);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [readOnly]);

  const apply = () => {
    if (!pending) return;
    const spans = store[pending.block] ?? [];
    write(
      storageKey,
      JSON.stringify({
        ...store,
        [pending.block]:
          pending.kind === 'add'
            ? addSpan(spans, pending.span)
            : removeSpanAt(spans, pending.start),
      }),
    );
    window.getSelection()?.removeAllRanges();
    setPending(null);
  };

  return (
    <HighlightContext.Provider value={{ store, readOnly }}>
      {children}
      {pending ? (
        <div
          data-hl-toolbar
          className="fixed z-50 -translate-x-1/2"
          style={{ top: pending.top, left: pending.left }}
        >
          <Button
            type="button"
            size="xs"
            variant={pending.kind === 'add' ? 'default' : 'outline'}
            // Keep the selection alive through the press.
            onPointerDown={(e) => e.preventDefault()}
            onClick={apply}
          >
            {pending.kind === 'add' ? 'Highlight' : 'Remove highlight'}
          </Button>
        </div>
      ) : null}
    </HighlightContext.Provider>
  );
}

/** One highlightable block of plain text. Outside a provider it is just text. */
export function HighlightText({
  id,
  text,
  className,
  as: As = 'p',
}: {
  id: string;
  text: string;
  className?: string;
  as?: 'p' | 'span';
}) {
  const { store, readOnly } = useContext(HighlightContext);
  const spans = store[id];
  return (
    <As data-hl-block={id} className={className}>
      {segments(text, Array.isArray(spans) ? spans : []).map((s) =>
        s.marked ? (
          <mark
            key={s.start}
            data-hl-start={s.start}
            className={cn(
              'bg-chrome/40 text-inherit',
              !readOnly && 'cursor-pointer',
            )}
          >
            {s.text}
          </mark>
        ) : (
          <Fragment key={s.start}>{s.text}</Fragment>
        ),
      )}
    </As>
  );
}
