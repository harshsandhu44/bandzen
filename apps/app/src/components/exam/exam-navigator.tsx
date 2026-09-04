'use client';

import type { ReactNode } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * The one question navigator for every runner — reading, listening, and (as a
 * per-prompt rail) speaking. Pinned to the bottom of the runner: thumb-reachable
 * on a phone, and out of the reading area on a desktop.
 *
 * One cell per question. Filled once answered, a chrome dot when flagged, an
 * outline ring on the current one. `kind="step"` marks the current cell
 * `aria-current="step"` for the speaking rail; `kind="question"` is the default.
 */

export type NavItem = {
  id: string;
  /** What shows in the cell — usually the 1-based number. */
  label: ReactNode;
  answered?: boolean;
  flagged?: boolean;
};

export function ExamNavigator({
  items,
  currentId,
  onJump,
  answeredCount,
  total,
  kind = 'question',
  countLabel = 'answered',
  legend = true,
  disabled = false,
  children,
}: {
  items: readonly NavItem[];
  currentId?: string;
  onJump: (id: string) => void;
  answeredCount: number;
  total: number;
  kind?: 'question' | 'step';
  countLabel?: string;
  legend?: boolean;
  /** The speaking rail locks while a recording or prep countdown runs. */
  disabled?: boolean;
  /** Trailing slot — the submit control, or prev/next for speaking. */
  children?: ReactNode;
}) {
  return (
    <nav
      aria-label="Questions"
      className="flex items-center gap-3 border-t border-border bg-background px-3 py-2"
    >
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {answeredCount} / {total}
        <span className="sr-only"> {countLabel}</span>
      </span>

      <ul className="flex flex-1 gap-1 overflow-x-auto p-0.5">
        {items.map((item) => {
          const current = item.id === currentId;
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onJump(item.id)}
                aria-current={
                  current ? (kind === 'step' ? 'step' : 'true') : undefined
                }
                className={cn(
                  'disabled:pointer-events-none disabled:opacity-50',
                  'relative grid size-6 place-items-center border border-border font-mono text-[0.625rem] text-muted-foreground transition-colors',
                  'hover:border-foreground/40',
                  item.answered &&
                    'border-primary bg-primary text-primary-foreground',
                  current &&
                    'outline outline-2 outline-offset-1 outline-foreground',
                )}
              >
                {item.label}
                {item.flagged ? (
                  <span
                    aria-hidden
                    className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-chrome"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {legend ? (
        <span className="hidden shrink-0 items-center gap-3 text-[0.6875rem] text-muted-foreground sm:flex">
          <span className="flex items-center gap-1">
            <span className="size-2 bg-primary" /> answered
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-chrome" /> flagged
          </span>
        </span>
      ) : null}

      {children ? <span className="shrink-0">{children}</span> : null}
    </nav>
  );
}
