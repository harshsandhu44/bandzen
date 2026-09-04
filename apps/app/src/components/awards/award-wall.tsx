import { Check, Lock } from 'lucide-react';
import { AWARD_CATALOGUE } from '@/lib/awards';
import type { Award } from '@/lib/db/schema';
import { Panel } from '@/components/app/primitives';

/**
 * The full ladder: what has been earned, and what the next one asks for.
 *
 * Unearned rows show their rule rather than being hidden, because something to
 * aim at is most of the point — a wall of mysteries motivates nobody. Nothing
 * here is a percentage or a score; each row is either true of the candidate's
 * history or it is not.
 */
export function AwardWall({ awards }: { awards: Award[] }) {
  const earned = new Map(awards.map((a) => [a.awardId, a.earnedAt]));

  return (
    <Panel headingId="awards-heading" title="Awards">
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {AWARD_CATALOGUE.map((award) => {
          const at = earned.get(award.id);
          return (
            <li
              key={award.id}
              className="flex items-start gap-3 border-b border-border pb-3"
            >
              {at ? (
                <Check
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-tick"
                />
              ) : (
                <Lock
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground/50"
                />
              )}
              <div className="space-y-0.5">
                <p
                  className={
                    at ? 'text-sm' : 'text-sm text-muted-foreground/70'
                  }
                >
                  {award.name}
                </p>
                <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-muted-foreground uppercase">
                  {at
                    ? `Earned ${at.toISOString().slice(0, 10)}`
                    : award.requirement}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 max-w-prose text-xs text-muted-foreground">
        A study day is a day you finished an attempt or a lesson. Streaks are
        kept once earned — missing a day ends the run, but never takes back an
        award you have already got.
      </p>
    </Panel>
  );
}
