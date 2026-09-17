import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Progress } from '@bandzen/ui/components/progress';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { ProTag } from '@/components/billing/pro';
import { getExam } from '@bandzen/exams/registry';
import { formatScore } from '@bandzen/exams/scoring';
import { ExamComingSoon } from '@/components/app/exam-coming-soon';
import { requireUserId } from '@/lib/auth';
import {
  diagnosticCount,
  examHasContent,
  getProfile,
  isPro,
  latestDiagnostic,
  latestOpenMock,
  listPublishedExamTasks,
} from '@/lib/db/queries';
import { canStartDiagnostic } from '@/lib/entitlements';
import { composeSitting } from '@/lib/exam-sitting';
import { nextPracticeStep, practiceOverview } from '@/lib/practice';
import { MODULE_LABEL } from '@/lib/modules';
import { DIAGNOSTIC_DURATION_LABEL } from '@/lib/timing';

export const metadata = { title: 'Practice' };

const MODULE_BLURB: Record<string, string> = {
  reading: 'Timed passages, filtered by the question type you want to drill.',
  writing: 'Task 2 prompts, graded against the four IELTS criteria.',
  listening: 'Tracks that play once, exactly as they do in the exam.',
  speaking: 'A full Parts 1–3 interview, graded from your audio.',
};

/**
 * The Practice hub. Mirrors the Learn hub: one recommendation up top, then a
 * card per module carrying its own band and question accuracy, then the
 * heavier timed tests.
 *
 * The module cards link to the config subpages (`/reading` etc.), which still
 * own the passage lists and filters. `/tests` folded in here — its tabs sent
 * people to those same pages, and its "completed" list duplicated /progress.
 */
export default async function PracticePage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const exam = getExam(profile?.examKey ?? 'ielts')!;

  if (!(await examHasContent(exam.key))) {
    return (
      <div className="max-w-4xl space-y-6">
        <PageHeader eyebrow="Practice" title="What do you want to practise?" />
        <ExamComingSoon
          exam={exam}
          targetScore={profile?.targetScore}
          testDate={profile?.testDate}
        />
      </div>
    );
  }

  const [overview, next, diagnostic, taken, pro, openMock, published] =
    await Promise.all([
      practiceOverview(userId, exam),
      nextPracticeStep(userId),
      latestDiagnostic(userId),
      diagnosticCount(userId),
      isPro(userId),
      latestOpenMock(userId),
      exam.key === 'ielts' ? [] : listPublishedExamTasks(exam.key),
    ]);

  // Same reckoning as `/mock`: a sitting composed from task items is only a
  // full mock if the bank can fill the format. See `composeSitting`.
  const mock = composeSitting(exam, published);
  const shortMock = mock.taskIds.length < mock.demanded;

  const canRetake = canStartDiagnostic({ isPro: pro, taken });

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Practice"
        title="What do you want to practise?"
        description="Short, focused sessions and full timed tests. Everything here is scored the same way."
      />

      {next ? (
        <Panel headingId="start-next" title="Start next">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-title text-title">{next.title}</p>
              <p className="text-sm text-muted-foreground">{next.reason}</p>
            </div>
            <Button nativeButton={false} render={<Link href={next.href} />}>
              {next.kind === 'diagnostic'
                ? 'Start diagnostic'
                : 'Start session'}
              <ArrowRight />
            </Button>
          </div>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {overview.map((m) => {
          const locked = m.module === 'speaking' && !pro;
          const pct = m.total ? Math.round((m.correct / m.total) * 100) : 0;
          const started = m.band != null || m.total > 0;
          return (
            <Link key={m.module} href={`/${m.module}`} className="group block">
              <Panel
                title={MODULE_LABEL[m.module]}
                className="h-full transition-shadow group-hover:ring-foreground/25"
                action={
                  locked ? (
                    <ProTag />
                  ) : m.band != null ? (
                    <span className="font-metric text-metric-sm">
                      {formatScore(exam.scoreScale, m.band)}
                    </span>
                  ) : m.total ? (
                    <span className="font-metric text-metric-sm text-muted-foreground">
                      {pct}%
                    </span>
                  ) : null
                }
              >
                {m.total > 0 ? (
                  <Progress
                    value={m.correct}
                    max={m.total}
                    aria-label={`${MODULE_LABEL[m.module]} question accuracy`}
                    className="mb-3"
                  />
                ) : null}
                <p className="text-sm text-muted-foreground text-pretty">
                  {/* PTE scores a skill only from a finished mock, never
                      from a practice set. */}
                  {exam.key === 'pte_academic' && m.band == null ? (
                    <span className="text-foreground">
                      Sit a mock test to get a score.{' '}
                    </span>
                  ) : !started ? (
                    <span className="text-foreground">Not started. </span>
                  ) : null}
                  {MODULE_BLURB[m.module]}
                </p>
              </Panel>
            </Link>
          );
        })}
      </div>

      <Panel headingId="tests-heading" title="Sit a test">
        <article className="border border-border">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-title text-title">Diagnostic</h3>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
              A full exam sitting — Listening, Reading and Writing (and Speaking
              on Pro), each section timed and in order. The fastest way to a
              first estimate in every skill and a plan built around it.
            </p>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
            {[
              ['Sections', 'Listening · Reading · Writing'],
              ['Duration', DIAGNOSTIC_DURATION_LABEL],
              ['Difficulty', 'Exam pace'],
              ['Status', diagnostic ? 'Attempted' : 'Not attempted'],
            ].map(([label, value]) => (
              <div key={label} className="px-5 py-3">
                <Eyebrow as="dt">{label!}</Eyebrow>
                <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-3 px-5 py-4">
            {canRetake ? (
              <Button nativeButton={false} render={<Link href="/diagnostic" />}>
                {taken ? 'Take another diagnostic' : 'Start diagnostic'}
                <ArrowRight />
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled>
                  Retake diagnostic <ProTag className="ml-2" />
                </Button>
                <p className="max-w-prose text-sm text-muted-foreground text-pretty">
                  You have had your free diagnostic. Retaking it is how you find
                  out whether you have actually moved — Pro includes as many as
                  you want.
                </p>
              </>
            )}
            {diagnostic ? (
              <Link
                href={`/diagnostic/${diagnostic.id}/result`}
                className="block text-sm underline underline-offset-4"
              >
                See your last result
              </Link>
            ) : null}
          </div>
        </article>

        <article className="mt-3 border border-border">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-title text-title">
              {shortMock ? 'Short mock test' : 'Full mock test'}
            </h3>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
              {shortMock
                ? `${mock.taskIds.length} questions against the real ${exam.name}'s ${mock.demanded}, in the exam's own order and lockstep.`
                : `All four skills, back to back, in real ${exam.name} order and real ${exam.name} lockstep — the closest this app gets to exam day.`}{' '}
              {!pro ? 'Pro.' : null}
            </p>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
            {[
              ['Sections', exam.sections.map((x) => x.label).join(' · ')],
              ['Duration', exam.duration],
              ['Difficulty', 'Full exam pace'],
              ['Status', openMock ? 'In progress' : 'Not started'],
            ].map(([label, value]) => (
              <div key={label} className="px-5 py-3">
                <Eyebrow as="dt">{label!}</Eyebrow>
                <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="px-5 py-4">
            <Button nativeButton={false} render={<Link href="/mock" />}>
              {openMock ? 'Resume mock test' : 'Start mock test'}
              {!pro ? <ProTag className="ml-2" /> : null}
              <ArrowRight />
            </Button>
          </div>
        </article>
      </Panel>
    </div>
  );
}
