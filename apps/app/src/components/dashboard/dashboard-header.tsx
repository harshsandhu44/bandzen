import Link from 'next/link';
import { Settings } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow } from '@/components/app/primitives';

/** Time-of-day greeting in the candidate's own zone, not the server's. */
export function greeting(timezone: string | null | undefined): string {
  let hour = new Date().getUTCHours();
  if (timezone) {
    try {
      hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone,
          hour: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    } catch {
      // An unknown zone is not worth failing the page over.
    }
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * The greeting, and the only route to Settings on a phone.
 *
 * Settings does not get one of the five tabs -- it is opened rarely and
 * deliberately -- so it gets the gear here instead. Hidden from `md` up, where
 * the sidebar already lists it.
 *
 * Shared because the dashboard renders this row twice: once above the
 * analytics, and once above the first-run block when nothing is measured yet.
 */
export function GreetingRow({
  firstName,
  timezone,
}: {
  firstName: string | null;
  timezone: string | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <h1 className="font-title text-title-lg">
        {greeting(timezone)}
        {firstName ? `, ${firstName}` : ''}
      </h1>

      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 md:hidden"
        nativeButton={false}
        render={<Link href="/settings" aria-label="Settings" />}
      >
        <Settings />
      </Button>
    </div>
  );
}

export function DashboardHeader({
  firstName,
  timezone,
  estimated,
  target,
  daysUntilTest,
  streak,
}: {
  firstName: string | null;
  timezone: string | null;
  estimated: number | null;
  target: number | null;
  daysUntilTest: number | null;
  /** The live study-day run. Rendered only above 1 -- see below. */
  streak: number;
}) {
  return (
    <header className="space-y-5">
      <GreetingRow firstName={firstName} timezone={timezone} />

      {/* items-start, so the three labels line up with each other. Aligning the
          bottoms instead pushes the label of the large figure out of the row. */}
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <div className="space-y-1">
          {/* "Estimated" is load-bearing: Bandzen scores are ours, not IELTS's. */}
          <Eyebrow>Estimated Band</Eyebrow>
          <p className="font-metric text-metric-lg">
            {estimated != null ? estimated.toFixed(1) : '—'}
          </p>
        </div>

        {target != null ? (
          <div className="space-y-1">
            <Eyebrow>Target</Eyebrow>
            <p className="font-metric text-metric">{target.toFixed(1)}</p>
          </div>
        ) : null}

        {daysUntilTest != null ? (
          <div className="space-y-1">
            <Eyebrow>Test</Eyebrow>
            <p className="font-metric text-metric tabular-nums">
              {daysUntilTest > 0
                ? `${daysUntilTest} days`
                : daysUntilTest === 0
                  ? 'Today'
                  : 'Passed'}
            </p>
          </div>
        ) : null}
        {/* Silent below two, the way SaveStatus is silent when idle. "1 day"
            is not a streak, and a zero would announce a failure on the one
            morning a candidate most needs a reason to start again. */}
        {streak > 1 ? (
          <div className="space-y-1">
            <Eyebrow>Streak</Eyebrow>
            <p className="font-metric text-metric tabular-nums">
              {streak} days
            </p>
          </div>
        ) : null}
      </div>

      {estimated != null ? (
        <BandScale
          value={estimated}
          target={target ?? undefined}
          variant="axis"
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        An estimate produced by Bandzen, not an official IELTS score.
      </p>
    </header>
  );
}
