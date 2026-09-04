import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { Card, CardContent } from '@bandzen/ui/components/card';
import { BandOverview } from '@/components/dashboard/band-overview';
import { ComingUp } from '@/components/dashboard/coming-up';
import { ContinuePlan } from '@/components/dashboard/continue-plan';
import {
  DashboardHeader,
  DashboardStats,
  GreetingRow,
} from '@/components/dashboard/dashboard-header';
import { FirstRun } from '@/components/dashboard/first-run';
import { QuickLinks } from '@/components/dashboard/quick-links';
import { QuotaMeter } from '@/components/billing/pro';
import { PerformanceInsight } from '@/components/dashboard/performance-insight';
import { RecentAttempts } from '@/components/dashboard/recent-attempts';
import { TodaysPlan } from '@/components/dashboard/todays-plan';
import { AwardStrip } from '@/components/awards/award-strip';
import { requireUserId } from '@/lib/auth';
import { daysUntil, todayIso } from '@/lib/dates';
import {
  essayAllowance,
  getProfile,
  isPro,
  listAwards,
  listCompletedAttempts,
  studyDays,
} from '@/lib/db/queries';
import { currentStreak, longestStreak } from '@/lib/awards';
import { buildInsight } from '@/lib/insight';
import { loadPlanData } from '@/lib/plan-data';
import { nextAction } from '@/lib/study-plan';

export const metadata = { title: 'Today' };

/**
 * Today. The app's home, and since /plan folded in here, the whole plan too.
 *
 * A fetch-and-compose shell: every decision it makes is either a pure function
 * from `lib/` or a component below it, so this file stays readable as the page
 * grows. The measured branch lays the blocks out as a card grid — a stat row
 * and the primary action above the fold, analysis in the main column, the
 * lighter running lists in a side rail.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // The one onboarding gate in the app. `/` redirects here, so this covers
  // every real entry without adding a second place to get auth wrong.
  if (!profile?.onboardingCompletedAt) redirect('/onboarding');

  const today = todayIso(profile.timezone);

  const [user, attempts, data, quota, awards, activeDays, pro] =
    await Promise.all([
      currentUser(),
      listCompletedAttempts(userId, 8),
      loadPlanData(userId, profile, today),
      essayAllowance(userId),
      listAwards(userId),
      studyDays(userId, profile.timezone),
      isPro(userId),
    ]);

  // Named for what it is: `days` in this file already means days until the exam.
  const streak = currentStreak(activeDays, today);
  const bestStreak = longestStreak(activeDays);

  const {
    planInput,
    plan,
    progress,
    estimated,
    measured,
    report,
    kindAccuracy,
  } = data;

  const days = profile.testDate
    ? daysUntil(profile.testDate, profile.timezone)
    : null;
  const next = progress.tasks.find((t) => t.status !== 'completed');

  // Nothing measured means nothing to analyse. Showing the analytics anyway is
  // how this page became a stack of empty states.
  if (!measured) {
    return (
      <div className="max-w-5xl space-y-10">
        <div className="space-y-5">
          <GreetingRow
            firstName={user?.firstName ?? null}
            timezone={profile.timezone}
          />
          <DashboardStats
            estimated={null}
            target={profile.targetBand}
            daysUntilTest={days}
            streak={streak}
            longestStreak={bestStreak}
          />
        </div>
        <AwardStrip awards={awards} />
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
    <div className="max-w-6xl space-y-4">
      <DashboardHeader
        firstName={user?.firstName ?? null}
        timezone={profile.timezone}
        estimated={estimated}
        target={profile.targetBand}
        daysUntilTest={days}
        streak={streak}
        longestStreak={bestStreak}
      />

      <AwardStrip awards={awards} />

      {next ? <ContinuePlan task={next} /> : null}

      <p className="text-sm">{nextAction(planInput)}</p>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          {progress.tasks.length ? <TodaysPlan progress={progress} /> : null}
          <PerformanceInsight insight={insight} />
          <BandOverview
            bands={{
              reading: data.readingBand,
              writing: data.writingBand,
              listening: data.listeningBand,
            }}
            target={profile.targetBand}
          />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <QuickLinks pro={pro} />
          {attempts.length ? <RecentAttempts attempts={attempts} /> : null}
          {quota.unlimited ? null : (
            <Card>
              <CardContent>
                <QuotaMeter
                  allowance={quota}
                  noun="essay marks"
                  source="dashboard"
                  timezone={profile.timezone}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ComingUp plan={plan} today={today} />
    </div>
  );
}
