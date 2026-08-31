import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { SectionHeader } from '@/components/app/primitives';
import { BandOverview } from '@/components/dashboard/band-overview';
import { ComingUp } from '@/components/dashboard/coming-up';
import { ContinuePlan } from '@/components/dashboard/continue-plan';
import {
  DashboardHeader,
  GreetingRow,
} from '@/components/dashboard/dashboard-header';
import { FirstRun } from '@/components/dashboard/first-run';
import { PerformanceInsight } from '@/components/dashboard/performance-insight';
import { TodaysPlan } from '@/components/dashboard/todays-plan';
import { requireUserId } from '@/lib/auth';
import { daysUntil, todayIso } from '@/lib/dates';
import { getProfile, listCompletedAttempts } from '@/lib/db/queries';
import { MODULE_LABEL } from '@/lib/modules';
import { buildInsight } from '@/lib/insight';
import { loadPlanData } from '@/lib/plan-data';
import { nextAction } from '@/lib/study-plan';

export const metadata = { title: 'Today' };

/**
 * Today. The app's home, and since /plan folded in here, the whole plan too.
 *
 * A fetch-and-compose shell: every decision it makes is either a pure function
 * from `lib/` or a component below it, so this file stays readable as the page
 * grows.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // The one onboarding gate in the app. `/` redirects here, so this covers
  // every real entry without adding a second place to get auth wrong.
  if (!profile?.onboardingCompletedAt) redirect('/onboarding');

  const today = todayIso(profile.timezone);

  const [user, attempts, data] = await Promise.all([
    currentUser(),
    listCompletedAttempts(userId, 8),
    loadPlanData(userId, profile, today),
  ]);

  const {
    planInput,
    plan,
    progress,
    estimated,
    measured,
    report,
    kindAccuracy,
  } = data;

  const days = profile.testDate ? daysUntil(profile.testDate, today) : null;
  const next = progress.tasks.find((t) => t.status !== 'completed');

  // Nothing measured means nothing to analyse. Showing the analytics anyway is
  // how this page became a stack of empty states.
  if (!measured) {
    return (
      <div className="max-w-5xl space-y-10">
        <GreetingRow
          firstName={user?.firstName ?? null}
          timezone={profile.timezone}
        />
        <FirstRun profile={profile} daysUntilTest={days} />
      </div>
    );
  }

  const insight = buildInsight({
    readingBand: data.readingBand,
    writingBand: data.writingBand,
    criteria: report?.criteria ?? null,
    kindAccuracy,
  });

  return (
    <div className="max-w-5xl space-y-10">
      <DashboardHeader
        firstName={user?.firstName ?? null}
        timezone={profile.timezone}
        estimated={estimated}
        target={profile.targetBand}
        daysUntilTest={days}
      />

      {next ? <ContinuePlan task={next} /> : null}

      <p className="text-sm">{nextAction(planInput)}</p>

      {progress.tasks.length ? <TodaysPlan progress={progress} /> : null}

      <ComingUp plan={plan} today={today} />

      <PerformanceInsight insight={insight} />

      <BandOverview
        bands={{ reading: data.readingBand, writing: data.writingBand }}
        target={profile.targetBand}
      />

      {attempts.length ? (
        <section className="space-y-3">
          <SectionHeader as="h2">Recent attempts</SectionHeader>
          <ul className="divide-y divide-border border-y border-border">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <Link
                  href={
                    a.module === 'reading'
                      ? `/reading/${a.id}/review`
                      : `/writing/${a.id}/report`
                  }
                  className="text-sm underline-offset-4 hover:underline"
                >
                  {MODULE_LABEL[a.module]}
                  {a.kind === 'diagnostic' ? ' · diagnostic' : ''}
                </Link>
                <span className="font-metric text-metric-sm">
                  {a.band?.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
