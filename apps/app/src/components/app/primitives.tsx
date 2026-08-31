import type { ReactNode } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * The application's shared furniture.
 *
 * Two type roles, and the split between them is the whole system:
 *
 * - `SectionHeader` / `PageHeader` name a screen or a section. Archivo, sentence
 *   case, sized from `--text-title-*`. These are the headings a candidate scans.
 * - `Eyebrow` labels a piece of instrumentation — a band figure, a countdown, a
 *   criterion. Mono, uppercase, tracked out.
 *
 * Mono is load-bearing here, not decorative. Using it for headings too is what
 * flattened every screen into the same grey ribbon: when everything is an
 * eyebrow, nothing is.
 */

/** The mono uppercase label that belongs to a number. */
export function Eyebrow({
  children,
  as: As = 'p',
  className,
}: {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'p' | 'span' | 'dt';
  className?: string;
}) {
  return (
    <As
      className={cn(
        'font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </As>
  );
}

/** A section title. Archivo, so it outranks the rows beneath it. */
export function SectionHeader({
  children,
  as: As = 'h2',
  className,
}: {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}) {
  return <As className={cn('font-title text-title', className)}>{children}</As>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="space-y-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-title text-title-lg">{title}</h1>
        {action}
      </div>
      {description ? (
        <div className="max-w-2xl text-sm text-muted-foreground text-pretty">
          {description}
        </div>
      ) : null}
    </header>
  );
}

/**
 * A single figure with its label. `hint` carries the qualifier that keeps a
 * number honest -- "estimate, not an official score" belongs next to the
 * number, not in a footnote.
 */
export function Metric({
  label,
  value,
  hint,
  size = 'default',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  size?: 'default' | 'lg';
}) {
  return (
    <div className="space-y-1">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={cn(
          'font-metric',
          size === 'lg' ? 'text-metric-lg' : 'text-metric',
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * The tick rule. The band scale's idiom at block scale -- the same measured
 * marks, drawn in one gradient rather than a row of nodes.
 *
 * `currentColor` rather than `--border`, because this rides an inverted ground
 * where a border-coloured line is invisible.
 */
function TickRule() {
  return (
    <div
      aria-hidden
      className="h-1.5 w-full border-b border-current/15 opacity-40"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px 12px)',
      }}
    />
  );
}

/**
 * The one loud thing on a screen.
 *
 * An instrument panel rather than a card: full-bleed ruled surface, an
 * inverted ground, and a single action. At most one per page -- its whole job
 * is to outrank everything else, which it cannot do twice.
 *
 * The ground is NOT `bg-ink text-paper`. Those two tokens swap in the `.dark`
 * block, so that pairing inverts into a white slab on a dark page. apps/web
 * never hits this because it ships light-only; this app has the theme toggle.
 */
export function FeatureBlock({
  eyebrow,
  title,
  meta,
  action,
  children,
  headingId,
  className,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  headingId?: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'relative bg-foreground text-background',
        'dark:bg-secondary dark:text-foreground dark:ring-1 dark:ring-border',
        className,
      )}
    >
      <TickRule />

      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="space-y-2">
          <p
            id={headingId}
            className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase opacity-70"
          >
            {eyebrow}
          </p>
          <p className="font-title text-title-lg">{title}</p>
          {meta ? (
            <p className="font-mono text-xs tracking-[0.14em] uppercase tabular-nums opacity-70">
              {meta}
            </p>
          ) : null}
          {children}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}

/**
 * An empty screen is an invitation to act, so this always names the next step.
 * A dashed rule says "nothing here yet" without pretending to be content.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border px-6 py-10 text-center">
      <p className="font-title text-title">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
