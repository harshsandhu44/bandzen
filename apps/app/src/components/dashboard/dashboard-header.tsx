import Link from 'next/link';
import { Settings } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { Metric, StatCard } from '@/components/app/primitives';

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

/**
 * The four figures the candidate opens the app to check, as a card row above
 * the fold. Shared by both dashboard branches so the frame is the same whether
 * or not anything has been scored yet.
 *
 * Every card is always present. A missing figure shows "—" with a line that
 * turns the gap into a next step rather than a verdict — the streak card in
 * particular never announces a broken run, it invites starting one.
 */
export function DashboardStats({
  estimated,
  target,
  daysUntilTest,
  streak,
  longestStreak,
}: {
  estimated: number | null;
  target: number | null;
  daysUntilTest: number | null;
  streak: number;
  longestStreak: number;
}) {
  const testValue =
    daysUntilTest == null
      ? '—'
      : daysUntilTest > 0
        ? `${daysUntilTest} ${daysUntilTest === 1 ? 'day' : 'days'}`
        : daysUntilTest === 0
          ? 'Today'
          : 'Passed';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatCard>
        {/* "Estimated" is load-bearing: Bandzen scores are ours, not IELTS's. */}
        <Metric
          label="Estimated band"
          value={estimated != null ? estimated.toFixed(1) : '—'}
          size="lg"
          hint={estimated == null ? 'Take the diagnostic' : undefined}
        />
      </StatCard>

      <StatCard>
        <Metric
          label="Target"
          value={target != null ? target.toFixed(1) : '—'}
          hint={target == null ? 'Set one in Settings' : undefined}
        />
      </StatCard>

      <StatCard>
        <Metric label="Test" value={testValue} />
      </StatCard>

      <StatCard>
        <Metric
          label="Streak"
          value={
            streak >= 1 ? `${streak} ${streak === 1 ? 'day' : 'days'}` : '—'
          }
          hint={
            streak >= 1
              ? longestStreak > streak
                ? `Best: ${longestStreak} days`
                : undefined
              : 'Practise today to start one'
          }
        />
      </StatCard>
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
  longestStreak,
}: {
  firstName: string | null;
  timezone: string | null;
  estimated: number | null;
  target: number | null;
  daysUntilTest: number | null;
  /** The live study-day run, and the best one so far for the streak card's hint. */
  streak: number;
  longestStreak: number;
}) {
  return (
    <header className="space-y-5">
      <GreetingRow firstName={firstName} timezone={timezone} />

      <DashboardStats
        estimated={estimated}
        target={target}
        daysUntilTest={daysUntilTest}
        streak={streak}
        longestStreak={longestStreak}
      />

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
