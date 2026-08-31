import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, SectionHeader } from '@/components/app/primitives';
import { BandOverview } from '@/components/dashboard/band-overview';
import { ContinuePlan } from '@/components/dashboard/continue-plan';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { PerformanceInsight } from '@/components/dashboard/performance-insight';
import { TodaysPlan } from '@/components/dashboard/todays-plan';
import { LESSON_FOR_KIND } from '@/content/lessons';
import { requireUserId } from '@/lib/auth';
import { dayBounds, daysUntil, todayIso } from '@/lib/dates';
import {
  accuracyByQuestionKind,
  attemptsSubmittedOn,
  getProfile,
  latestBand,
  latestReport,
  listCompletedAttempts,
  listLessonProgress,
  listPassages,
  listWritingPrompts,
} from '@/lib/db/queries';
import { buildInsight } from '@/lib/insight';
import {
  buildPlan,
  derivePlanState,
  nextAction,
  tasksOn,
} from '@/lib/study-plan';

export const metadata = { title: 'Dashboard' };

const mean = (a: number, b: number) => Math.round(((a + b) / 2) * 2) / 2;

/**
 * The dashboard. A fetch-and-compose shell: every decision it makes is either
 * a pure function from `lib/` or a component below it, so this file stays
 * readable as the page grows.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // The one onboarding gate in the app. `/` redirects here, so this covers
  // every real entry without adding a second place to get auth wrong.
  if (!profile?.onboardingCompletedAt) redirect('/onboarding');

  const today = todayIso(profile.timezone);
  const { start, end } = dayBounds(today, profile.timezone);

  const [
    user,
    attempts,
    readingBand,
    writingBand,
    report,
    kindAccuracy,
    doneToday,
    lessons,
    passages,
    prompts,
  ] = await Promise.all([
    currentUser(),
    listCompletedAttempts(userId, 8),
    latestBand(userId, 'reading'),
    latestBand(userId, 'writing'),
    latestReport(userId),
    accuracyByQuestionKind(userId),
    attemptsSubmittedOn(userId, start, end),
    listLessonProgress(userId),
    listPassages(),
    listWritingPrompts(),
  ]);

  const estimated =
    readingBand != null && writingBand != null
      ? mean(readingBand, writingBand)
      : (readingBand ?? writingBand);

  const planInput = {
    readingBand,
    writingBand,
    targetBand: profile.targetBand,
    testDate: profile.testDate,
    weaknesses: report?.weaknesses ?? undefined,
    weakKinds: [...kindAccuracy]
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((k) => k.kind),
    catalogue: {
      passageIds: passages.map((p) => p.id),
      promptIds: prompts.map((p) => p.id),
      lessonForKind: LESSON_FOR_KIND,
      completedLessonIds: lessons.map((l) => l.lessonId),
    },
  };

  const plan = buildPlan(planInput);
  const progress = derivePlanState(
    tasksOn(plan, today),
    {
      modulesCompletedToday: doneToday.map((a) => a.module),
      completedLessonIds: lessons.map((l) => l.lessonId),
    },
    profile.studyMinutes,
  );

  const next = progress.tasks.find((t) => t.status !== 'completed');
  const measured = readingBand != null || writingBand != null;

  const insight = buildInsight({
    readingBand,
    writingBand,
    criteria: report?.criteria ?? null,
    kindAccuracy,
  });

  return (
    <div className="max-w-3xl space-y-10">
      <DashboardHeader
        firstName={user?.firstName ?? null}
        timezone={profile.timezone}
        estimated={estimated}
        target={profile.targetBand}
        daysUntilTest={
          profile.testDate ? daysUntil(profile.testDate, today) : null
        }
      />

      {!measured ? (
        <EmptyState
          title="Nothing measured yet"
          description="A diagnostic takes one reading passage and one essay. It is what turns the plan below from a default into yours."
          action={
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/diagnostic" />}
            >
              Take the diagnostic
            </Button>
          }
        />
      ) : null}

      {next ? <ContinuePlan task={next} /> : null}

      {/* nextAction's no-estimate line repeats the empty state above it word
          for word, so it only earns its place once something is measured. */}
      {measured ? <p className="text-sm">{nextAction(planInput)}</p> : null}

      {progress.tasks.length ? (
        <TodaysPlan progress={progress} />
      ) : (
        <EmptyState
          title="No tasks scheduled today"
          description={
            profile.testDate
              ? 'Your exam date has passed. Update it in Settings to start a new plan.'
              : 'Add a target band in Settings to generate a plan.'
          }
        />
      )}

      <PerformanceInsight insight={insight} />

      <BandOverview
        bands={{ reading: readingBand, writing: writingBand }}
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
                  className="font-mono text-xs tracking-widest uppercase underline-offset-4 hover:underline"
                >
                  {a.module}
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
