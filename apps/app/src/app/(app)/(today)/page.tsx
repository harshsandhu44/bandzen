import Link from 'next/link';
import { SubmitButton } from '@/components/app/submit-button';
import { resumePlan } from '@/app/(app)/plan/actions';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@bandzen/ui/components/card';
import { examSkills, getExam } from '@bandzen/exams/registry';
import { ExamComingSoon } from '@/components/app/exam-coming-soon';
import { ScoreOverview } from '@/components/dashboard/score-overview';
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
import { currentUser, requireUserId } from '@/lib/auth';
import { daysUntil, todayIso } from '@/lib/dates';
import {
  examHasContent,
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

/** Why the plan last changed, in the dashboard's words. */
const REVISION_NOTE = {
  settings_changed: 'your settings changed',
  new_score: 'a new score came in',
  user_replan: 'you asked for a new plan',
  missed_work: 'missed work was carried over',
  content_unavailable: 'some material was withdrawn and replaced',
  paused: 'paused',
  resumed: 'resumed from today',
} as const;

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
  const exam = getExam(profile.examKey ?? 'ielts')!;

  if (!(await examHasContent(exam.key))) {
    const user = await currentUser();
    return (
      <div className="max-w-5xl space-y-10">
        <GreetingRow
          firstName={user?.firstName ?? null}
          timezone={profile.timezone}
        />
        <ExamComingSoon
          exam={exam}
          targetScore={profile.targetScore}
          testDate={profile.testDate}
        />
      </div>
    );
  }

  const today = todayIso(profile.timezone);

  const [user, attempts, data, quota, awards, activeDays, pro] =
    await Promise.all([
      currentUser(),
      listCompletedAttempts(userId, 8, exam.key),
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
    testDay,
    restDay,
    paused,
    revision,
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
            target={profile.targetScore}
            scale={exam.scoreScale}
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
    listeningBand: data.listeningBand,
    criteria: report?.criteria ?? null,
    kindAccuracy,
    listeningAccuracy: data.listeningAccuracy,
  });

  return (
    <div className="max-w-6xl space-y-4">
      <DashboardHeader
        firstName={user?.firstName ?? null}
        timezone={profile.timezone}
        examName={exam.name}
        scale={exam.scoreScale}
        estimated={estimated}
        target={profile.targetScore}
        daysUntilTest={days}
        streak={streak}
        longestStreak={bestStreak}
      />

      <AwardStrip awards={awards} />

      {next ? <ContinuePlan task={next} /> : null}

      {planInput ? <p className="text-sm">{nextAction(planInput)}</p> : null}

      {/* The plan stops at the test date; say so rather than going quiet. */}
      {paused ? (
        <form action={resumePlan} className="flex flex-wrap items-center gap-3">
          <p className="text-sm">
            Your plan is paused. Nothing new is scheduled and nothing rolls
            over.
          </p>
          <SubmitButton size="sm" variant="outline" pendingLabel="Resuming…">
            Resume plan
          </SubmitButton>
        </form>
      ) : revision ? (
        <p className="text-sm text-muted-foreground">
          Plan updated: {REVISION_NOTE[revision.reason]}
          {revision.detail ? ` (${revision.detail})` : ''}.
        </p>
      ) : null}

      {restDay && !progress.tasks.length ? (
        <p className="text-sm text-muted-foreground">
          Rest day. Nothing is scheduled.
        </p>
      ) : null}

      {testDay === 'exam_day' ? (
        <p className="text-sm text-muted-foreground">
          It is exam day, so nothing is scheduled. Good luck.
        </p>
      ) : testDay === 'passed' ? (
        <p className="text-sm text-muted-foreground">
          Your test date has passed.{' '}
          <Link href="/settings" className="underline underline-offset-4">
            Update it
          </Link>{' '}
          to plan again.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          {progress.tasks.length ? (
            <TodaysPlan progress={progress} today={today} />
          ) : null}
          <PerformanceInsight insight={insight} />
          <ScoreOverview
            scale={exam.scoreScale}
            skills={examSkills(exam)}
            scores={{
              reading: data.readingBand,
              writing: data.writingBand,
              listening: data.listeningBand,
              speaking: data.speakingBand,
            }}
            target={profile.targetScore}
          />
        </div>

        <div className="space-y-4 lg:col-span-5">
          <QuickLinks pro={pro} />
          {attempts.length ? (
            <RecentAttempts attempts={attempts} scale={exam.scoreScale} />
          ) : null}
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
