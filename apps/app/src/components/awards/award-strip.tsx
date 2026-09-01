import { getAward } from '@/lib/awards';
import type { Award } from '@/lib/db/schema';
import { acknowledgeAwards } from '@/app/(app)/(today)/actions';

/**
 * What the candidate has just earned, said once.
 *
 * A live region rather than a toast: this repo has no toast library and does
 * not want one for this. `role="status"` is announced without stealing focus,
 * which is the right register — an award is worth mentioning, not worth
 * interrupting someone for.
 *
 * Silent when there is nothing new, following `save-status.tsx`. It renders on
 * the dashboard rather than at the moment of earning because the write paths
 * all redirect somewhere else (a review page, a report, a lesson), and there is
 * no honest place to put a celebration in the middle of those.
 */
export function AwardStrip({ awards }: { awards: Award[] }) {
  const fresh = awards.filter((a) => !a.notifiedAt);
  if (!fresh.length) return null;

  const named = fresh
    .map((a) => getAward(a.awardId))
    .filter((a) => a !== undefined);
  // An id with no catalogue entry is a removed award. Nothing to say about it,
  // but the row still gets acknowledged so it cannot wedge the strip open.
  if (!named.length) return null;

  return (
    <section
      role="status"
      aria-labelledby="awards-new-heading"
      className="flex flex-col gap-4 border-l-2 border-tick bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="space-y-1">
        <p
          id="awards-new-heading"
          className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase"
        >
          {named.length === 1
            ? 'Award earned'
            : `${named.length} awards earned`}
        </p>
        <p className="font-title text-title">
          {named.map((a) => a.name).join(' · ')}
        </p>
        <p className="max-w-prose text-xs text-muted-foreground">
          {named.length === 1
            ? named[0]!.requirement
            : 'Kept for good — a missed day never takes one back.'}
        </p>
      </div>

      <form action={acknowledgeAwards} className="shrink-0">
        <button
          type="submit"
          className="font-mono text-xs tracking-[0.14em] uppercase underline underline-offset-4"
        >
          Got it
        </button>
      </form>
    </section>
  );
}
