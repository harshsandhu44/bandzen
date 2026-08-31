import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Sparkle } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, Metric, SectionHeader } from '@/components/app/primitives';
import { TaskStatus } from '@/components/app/status';
import { TodaysPlan } from '@/components/dashboard/todays-plan';
import { targetHref } from '@/components/dashboard/continue-plan';
import { LESSON_FOR_KIND } from '@/content/lessons';
import { requireUserId } from '@/lib/auth';
import { dayBounds, daysUntil, todayIso } from '@/lib/dates';
import {
  accuracyByQuestionKind,
  attemptsSubmittedOn,
  getProfile,
  latestBand,
  latestReport,
  listLessonProgress,
  listPassages,
  listWritingPrompts,
} from '@/lib/db/queries';
import { MODULE_LABEL } from '@/lib/modules';
import { buildPlan, derivePlanState, tasksOn } from '@/lib/study-plan';

export const metadata = { title: 'Study plan' };

const WEEKDAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  timeZone: 'UTC',
});
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const mean = (a: number, b: number) => Math.round(((a + b) / 2) * 2) / 2;

export default async function PlanPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile?.onboardingCompletedAt) redirect('/onboarding');

  const today = todayIso(profile.timezone);
  const { start, end } = dayBounds(today, profile.timezone);

  const [
    readingBand,
    writingBand,
    report,
    kindAccuracy,
    doneToday,
    lessons,
    passages,
    prompts,
  ] = await Promise.all([
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

  const completedLessonIds = lessons.map((l) => l.lessonId);

  const plan = buildPlan({
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
      completedLessonIds,
    },
  });

  const todayProgress = derivePlanState(
    tasksOn(plan, today),
    {
      modulesCompletedToday: doneToday.map((a) => a.module),
      completedLessonIds,
    },
    profile.studyMinutes,
  );

  // Everything after today. Days are grouped rather than listed flat, because
  // the plan is a week you can look at, not a backlog.
  const upcoming = plan.filter((t) => t.date > today);
  const byDay = new Map<string, typeof upcoming>();
  for (const task of upcoming) {
    byDay.set(task.date, [...(byDay.get(task.date) ?? []), task]);
  }

  const days = profile.testDate ? daysUntil(profile.testDate, today) : null;

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-5">
        <SectionHeader as="p">Study plan</SectionHeader>
        <h1 className="text-2xl font-medium tracking-tight text-balance">
          {profile.targetBand != null
            ? `Your path to Band ${profile.targetBand.toFixed(1)}`
            : 'Your preparation plan'}
        </h1>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Metric
            label="Estimated Band"
            value={estimated != null ? estimated.toFixed(1) : '—'}
          />
          {profile.targetBand != null ? (
            <Metric label="Target" value={profile.targetBand.toFixed(1)} />
          ) : null}
          {days != null ? (
            <Metric
              label="Days remaining"
              value={days > 0 ? days : days === 0 ? 'Today' : 'Passed'}
            />
          ) : null}
        </div>

        {report ? (
          <p className="inline-flex items-center gap-2 border-l-2 border-chrome py-1.5 pl-3 text-xs text-muted-foreground">
            <Sparkle className="size-3 shrink-0" aria-hidden />
            Updated after your latest graded essay on{' '}
            {DATE.format(report.createdAt)}.
          </p>
        ) : null}
      </header>

      {todayProgress.tasks.length ? (
        <TodaysPlan progress={todayProgress} />
      ) : (
        <EmptyState
          title="Nothing scheduled today"
          description={
            profile.testDate && days !== null && days <= 0
              ? 'Your exam date has passed. Update it in Settings to start a new plan.'
              : 'Your plan has run its course. Set a new target or exam date in Settings.'
          }
          action={
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/settings" />}
            >
              Open settings
            </Button>
          }
        />
      )}

      {byDay.size ? (
        <section aria-labelledby="upcoming-heading" className="space-y-5">
          <SectionHeader as="h2">
            <span id="upcoming-heading">Coming up</span>
          </SectionHeader>

          <ol className="space-y-6">
            {[...byDay.entries()].map(([date, tasks]) => {
              const d = new Date(`${date}T00:00:00Z`);
              return (
                <li key={date} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <div className="border-l-2 border-border pl-3 sm:border-l-0 sm:pl-0">
                    <p className="font-mono text-xs tracking-widest uppercase">
                      {WEEKDAY.format(d)}
                    </p>
                    <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
                      {DATE.format(d)}
                    </p>
                  </div>

                  <ul className="divide-y divide-border border-y border-border">
                    {tasks.map((task, i) => {
                      const href = targetHref({ ...task, status: 'pending' });
                      return (
                        <li
                          key={`${date}-${i}`}
                          className="flex items-center gap-3 py-3"
                        >
                          <TaskStatus status="pending" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{task.label}</p>
                            <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
                              {MODULE_LABEL[task.skill]} · {task.minutes} min
                            </p>
                          </div>
                          {href ? (
                            <Link
                              href={href}
                              className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline"
                            >
                              Open
                            </Link>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <p className="max-w-prose text-xs text-muted-foreground">
        This plan is generated from your bands, your exam date and the
        weaknesses found in your marked work. It is recalculated every time you
        open it, so finishing a test changes tomorrow rather than next week.
      </p>
    </div>
  );
}
