import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { evaluatorFor } from '@bandzen/exams/scoring';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { requireContentRole, requireUserId } from '@/lib/auth';
import { getAttempt, getExamTaskReview } from '@/lib/db/queries';

export const metadata = { title: 'Task review', robots: { index: false } };

export default async function TaskReviewPage({
  params,
}: PageProps<'/practice/[exam]/[task]/[attemptId]/review'>) {
  await requireContentRole();
  const { exam: examKey, task: taskKey, attemptId } = await params;

  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const userId = await requireUserId();

  // A model-graded task is still being marked when the candidate arrives here.
  // Say so rather than 404ing, and say it without a fake percentage.
  const pending = await getAttempt(userId, attemptId);
  if (pending?.status === 'grading') {
    return (
      <div className="max-w-2xl space-y-6">
        <PageHeader
          eyebrow={`${exam.name} · ${task.label}`}
          title="Marking your answer"
          description="A grader is working through it. This page will show the result once it is done."
        />
        <Panel headingId="grading" title="In progress">
          <p className="text-sm text-muted-foreground">
            Reload in a moment. Nothing is lost if you close this page.
          </p>
        </Panel>
      </div>
    );
  }

  // Refuses an attempt still in progress, so the keys below cannot be read
  // before it is over.
  const data = await getExamTaskReview(userId, attemptId);
  if (!data || data.attempt.taskType !== task.key) notFound();

  const { mark } = evaluatorFor(exam.key, task.key);
  const { rawScore, total } = data.attempt;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        eyebrow={`${exam.name} · ${task.label}`}
        title={
          mark && total != null
            ? `${rawScore ?? 0} of ${total}`
            : 'Answers recorded'
        }
        description={
          mark
            ? 'Raw marks. A score on this exam\u2019s own scale arrives with the score report.'
            : 'A model grades this task type. Its score arrives with the score report.'
        }
      />

      {data.items.map((row, n) => {
        const marks = mark ? mark(row.answer ?? [], row.value) : null;
        return (
          <Panel
            key={row.taskId}
            headingId={row.taskId}
            title={`${n + 1}. ${row.title}`}
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Your answer</dt>
                <dd className="font-mono text-xs break-all">
                  {row.value || row.audioUrl || '—'}
                </dd>
              </div>
              {row.answer?.length ? (
                <div>
                  <dt className="text-muted-foreground">Accepted</dt>
                  <dd className="font-mono text-xs">
                    {row.answer.join(' · ')}
                  </dd>
                </div>
              ) : null}
              {marks ? (
                <div>
                  <dt className="text-muted-foreground">Marks</dt>
                  <dd>
                    {marks.correct} of {marks.total}
                  </dd>
                </div>
              ) : null}
              {/* Only ever after submission — during an attempt the transcript
                  sits in a table the runner's loader never joins. */}
              {row.transcript ? (
                <div>
                  <dt className="text-muted-foreground">Transcript</dt>
                  <dd className="leading-6">{row.transcript}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        );
      })}

      <div className="flex gap-3">
        <Button
          nativeButton={false}
          render={<Link href={`/practice/${exam.key}/${task.key}`} />}
        >
          Practise again
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/practice" />}
        >
          Back to practice
        </Button>
      </div>
      <Eyebrow>Staff preview</Eyebrow>
    </div>
  );
}
