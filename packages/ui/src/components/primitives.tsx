import type { ReactNode } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * The product surfaces' shared furniture, used by apps/app and apps/admin.
 *
 * Two type roles, and the split between them is the whole system:
 *
 * - `SectionHeader` / `PageHeader` name a screen or a section. Archivo,
 *   sentence case, sized from `--text-title-*`. These are the headings someone
 *   scans to find their place.
 * - `Eyebrow` labels a piece of instrumentation — a band figure, a countdown, a
 *   criterion, a content count. Mono, uppercase, tracked out.
 *
 * Mono is load-bearing here, not decorative. Using it for headings too is what
 * flattened every screen into the same grey ribbon: when everything is an
 * eyebrow, nothing is.
 *
 * `.font-title`, `.font-metric` and the `--text-title-*` / `--text-metric-*`
 * scales all live in ./../styles/globals.css alongside these, so a consuming
 * app gets the components and the type they are set in from one import. The
 * app must still load Archivo, Inter and a mono face — and Archivo as the
 * STATIC cut, see the note on `.font-title`.
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
  hint?: ReactNode;
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
