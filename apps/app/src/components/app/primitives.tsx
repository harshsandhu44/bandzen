import type { ReactNode } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * The application's shared furniture.
 *
 * These are compositions, not new design — every one of them is a pattern the
 * reading, writing and report screens already established, extracted so nine
 * more pages spell it the same way. Nothing here introduces a colour, a font
 * or a radius that was not already in the theme.
 */

/** The mono uppercase label used for every section heading in the app. */
export function SectionHeader({
  children,
  as: As = 'h2',
  className,
}: {
  children: ReactNode;
  as?: 'h2' | 'h3' | 'p';
  className?: string;
}) {
  return (
    <As
      className={cn(
        'font-mono text-xs tracking-widest text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </As>
  );
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
      {eyebrow ? <SectionHeader as="p">{eyebrow}</SectionHeader> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-medium tracking-tight text-balance">
          {title}
        </h1>
        {action}
      </div>
      {description ? (
        <div className="max-w-2xl text-sm text-muted-foreground">
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
      <SectionHeader as="p">{label}</SectionHeader>
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
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
