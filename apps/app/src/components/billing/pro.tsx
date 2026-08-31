import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { FeatureBlock } from '@/components/app/primitives';
import type { Allowance } from '@/lib/entitlements';

/**
 * The restriction vocabulary. Three states, three marks, and the whole point
 * is that a candidate can tell them apart at a glance:
 *
 * - **Unbuilt** keeps the `Lock` idiom that already exists in `status.tsx` —
 *   muted, dashed, and never a call to action, because no amount of money
 *   opens it.
 * - **Pro-gated** is `ProTag`: `--chrome`, never a lock, and always something
 *   to press. `--chrome` is the token this app reserves for things that mean
 *   something, which is exactly what distinguishes it from decoration.
 * - **Used up** is `QuotaMeter`: not a lock at all, because it is temporary
 *   and it says when it ends.
 *
 * Reusing one lock for all three would make every lock a coin flip between a
 * checkout page and a dead end.
 */

const WEEKDAY = new Intl.DateTimeFormat('en-GB', { weekday: 'long' });
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

/** "Thursday" while that is unambiguous, "14 Sep" once it is not. */
export function resetLabel(at: Date, now: Date = new Date()): string {
  const days = Math.ceil((at.getTime() - now.getTime()) / 86_400_000);
  return days <= 6 ? WEEKDAY.format(at) : DATE.format(at);
}

export function ProTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center border border-chrome px-1.5 font-mono text-[0.625rem] leading-4 tracking-[0.18em] text-chrome uppercase',
        className,
      )}
    >
      Pro
    </span>
  );
}

/**
 * What is left, shown from the first visit rather than only once it runs out.
 *
 * An allowance a candidate can see themselves spending is one they can plan
 * around; a limit that appears at zero reads as the product tightening on
 * them. The bar is the idiom `todays-plan.tsx` already uses, deliberately —
 * this is the same kind of statement about the same kind of budget.
 */
export function QuotaMeter({
  allowance,
  noun,
  source,
  id,
  className,
}: {
  allowance: Allowance;
  /** Plural, lower case: "essay marks", "Coach messages". */
  noun: string;
  source: string;
  id?: string;
  className?: string;
}) {
  if (allowance.unlimited) return null;

  const used = Math.min(allowance.used, allowance.limit);
  const pct = Math.round((used / allowance.limit) * 100);
  const spent = allowance.remaining === 0;

  return (
    <div id={id} className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm">
          <span className="font-metric text-metric-sm tabular-nums">
            {allowance.remaining} of {allowance.limit}
          </span>{' '}
          <span className={spent ? 'text-foreground' : 'text-muted-foreground'}>
            {noun} left this week
          </span>
        </p>

        <p className="text-xs text-muted-foreground">
          {allowance.resetsAt ? (
            <>Next one {resetLabel(allowance.resetsAt)} · </>
          ) : null}
          <Link
            href={`/upgrade?from=${source}`}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Unlimited with Pro
          </Link>
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={allowance.limit}
        aria-label={`${noun} used this week`}
        className="h-1 w-full bg-border"
      >
        <div
          className={cn('h-1', spent ? 'bg-chrome' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * The one loud ask on a screen, and never more than one — `FeatureBlock`'s
 * whole job is to outrank everything else, which it cannot do twice.
 *
 * Placed *below* whatever the candidate came for, never above it.
 */
export function UpgradePrompt({
  eyebrow,
  title,
  meta,
  source,
  cta = 'See Pro',
  children,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  source: string;
  cta?: string;
  children?: ReactNode;
}) {
  return (
    <FeatureBlock
      eyebrow={eyebrow}
      title={title}
      meta={meta}
      action={
        <Button
          nativeButton={false}
          render={<Link href={`/upgrade?from=${source}`} />}
        >
          {cta}
          <ArrowRight />
        </Button>
      }
    >
      {children}
    </FeatureBlock>
  );
}

/**
 * A locked row for something that exists and can be bought — as opposed to
 * `LockedModule`, which is for something that does not exist at all.
 */
export function ProLocked({
  title,
  description,
  source,
}: {
  title: string;
  description: string;
  source: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border border-border px-5 py-4">
      <div className="space-y-1">
        <p className="flex items-center gap-2 font-title text-sm">
          {title}
          <ProTag />
        </p>
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`/upgrade?from=${source}`} />}
      >
        Upgrade
      </Button>
    </div>
  );
}
