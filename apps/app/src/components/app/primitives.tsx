import type { ReactNode } from 'react';
import { Sparkle } from 'lucide-react';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
} from '@bandzen/ui/components/card';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * Eyebrow, SectionHeader, PageHeader, Metric and EmptyState now live in
 * `@bandzen/ui/components/primitives`, shared with apps/admin. They are
 * re-exported here so the 22 call sites in this app keep importing from one
 * place, and so this file can stay the home of the one primitive that did NOT
 * move.
 */
export {
  Eyebrow,
  EmptyState,
  Metric,
  PageHeader,
  SectionHeader,
} from '@bandzen/ui/components/primitives';

/**
 * The dashboard and progress pages read as a grid of cards now, not one
 * vertical stack. These two wrap the shared shadcn `Card` so a page composes
 * panels instead of repeating the header/content boilerplate at every call.
 *
 * `Panel` heads its card with a real `<h2>` rather than shadcn's `CardTitle`
 * div, so the grid stays navigable by heading. The bare `<section>` +
 * `SectionHeader` pattern still applies to anything that runs full width down
 * the page.
 */
export function StatCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Panel({
  title,
  action,
  headingId,
  children,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  headingId?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <h2 id={headingId} className="font-heading text-sm font-medium">
          {title}
        </h2>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
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
 * The one loud thing on a screen. Deliberately NOT promoted to @bandzen/ui:
 * it describes an exam surface -- an inverted ground, at most one per page,
 * carrying the band-scale tick idiom -- and a CMS has none of those. Sharing
 * it would also share the hazard in the note below, whose reasoning only makes
 * sense if you know this app's history.
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
 * The dark "AI insight" bar from the landing page's module demos
 * (`apps/web/.../module-panel.tsx`), ported for review/report/insight
 * screens in this app. Deliberately `bg-foreground text-background` rather
 * than `bg-ink text-paper` — see the note on `FeatureBlock` above: that pair
 * swaps under `.dark` and would invert into a white bar on a dark page.
 *
 * `bg-foreground text-background` alone has the same problem one step
 * removed: in dark mode `--foreground` is light, so it renders as a *white*
 * card, not a dark one. The `dark:` override below is copied from
 * `FeatureBlock` for the same reason it exists there — a quieter bordered
 * `--secondary` surface in dark mode instead of a literal inversion.
 */
export function InsightBar({
  icon: Icon = Sparkle,
  children,
  className,
}: {
  /** Defaults to `Sparkle`. Swap it for e.g. `Repeat` on a recurring-pattern insight. */
  icon?: typeof Sparkle;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 bg-foreground px-4 py-3 text-background',
        'dark:bg-secondary dark:text-foreground dark:ring-1 dark:ring-border',
        className,
      )}
    >
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <p className="text-sm leading-snug">
        <span className="sr-only">AI insight: </span>
        {children}
      </p>
    </div>
  );
}

/**
 * The oversized ghost-letter watermark from the landing page's module demos.
 * Static — no `bz-drift` parallax, apps/app's rule is motion almost never.
 * The parent must be `relative isolate overflow-clip` for this to sit
 * correctly behind its content (see `module-panel.tsx` for the pattern).
 */
export function Watermark({ text }: { text: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -top-4 -right-4 -z-10 font-title text-[6rem] leading-none text-secondary select-none"
    >
      {text.slice(0, 3).toUpperCase()}
    </span>
  );
}
