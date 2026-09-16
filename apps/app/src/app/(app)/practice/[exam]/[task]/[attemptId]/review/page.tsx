import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { evaluatorFor, isAnswerCorrect } from '@bandzen/exams/scoring';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { requireUserId } from '@/lib/auth';
import { getAttempt, getExamTaskReview } from '@/lib/db/queries';

export const metadata = { title: 'Task review', robots: { index: false } };

/** Multi-part answers are stored as a JSON array; a malformed one reads empty. */
function parts(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export default async function TaskReviewPage({
  params,
}: PageProps<'/practice/[exam]/[task]/[attemptId]/review'>) {
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

      {/* Model-graded only: a deterministic task's dimensions are correct/total,
          not traits out of five, and rendering them here would say 2 / 5 for
          what was actually full marks. */}
      {!mark && data.attempt.assessment ? (
        <Panel headingId="grader" title="What the grader found">
          <div className="space-y-5 text-sm">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {Object.entries(data.attempt.assessment.dimensions).map(
                ([name, score]) => (
                  <div key={name}>
                    <dt className="text-muted-foreground">{name}</dt>
                    <dd className="font-mono tabular-nums">
                      {score == null ? '\u2014' : `${score} / 5`}
                    </dd>
                  </div>
                ),
              )}
            </dl>

            {data.attempt.assessment.strengths.length ? (
              <div className="space-y-1">
                <Eyebrow>Strengths</Eyebrow>
                <ul className="list-disc space-y-1 pl-5">
                  {data.attempt.assessment.strengths.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.attempt.assessment.weaknesses.length ? (
              <div className="space-y-1">
                <Eyebrow>To work on</Eyebrow>
                <ul className="list-disc space-y-1 pl-5">
                  {data.attempt.assessment.weaknesses.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {data.attempt.assessment.feedback.map((f, i) => (
              <div key={i} className="border-l-2 border-border pl-4">
                <p className="text-muted-foreground italic">“{f.quote}”</p>
                <p>{f.comment}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {data.items.map((row, n) => {
        const marks = mark ? mark(row.answer ?? [], row.value) : null;
        const given = parts(row.value);
        // Per gap, which is what makes a partly-right answer legible. Only
        // ever here: the key reaches this page because the attempt is over.
        const gaps =
          task.evaluator === 'gap_match' && row.answer
            ? row.answer.map((key, i) => ({
                accepted: key.split('|'),
                given: given[i] ?? '',
                ok: isAnswerCorrect(key.split('|'), given[i]),
              }))
            : null;
        // Marked words come back as positions; show the words themselves,
        // because a list of numbers tells the candidate nothing.
        const markedWords =
          task.renderer === 'token_select'
            ? given
                .map((at) => row.content.tokens?.[Number(at)])
                .filter((word): word is string => Boolean(word))
            : null;
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
              {markedWords ? (
                <div>
                  <dt className="text-muted-foreground">Words you marked</dt>
                  <dd className="font-mono text-xs">
                    {markedWords.length ? markedWords.join(' · ') : '—'}
                  </dd>
                </div>
              ) : null}
              {gaps ? (
                <div>
                  <dt className="text-muted-foreground">Gaps</dt>
                  <dd>
                    <ol className="space-y-1">
                      {gaps.map((gap, i) => (
                        <li key={i} className="flex items-baseline gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {i + 1}
                          </span>
                          <span
                            className={cn(
                              'font-mono text-xs',
                              gap.ok ? 'text-foreground' : 'text-destructive',
                            )}
                          >
                            {gap.given || '—'}
                          </span>
                          {gap.ok ? null : (
                            <span className="font-mono text-xs text-muted-foreground">
                              → {gap.accepted.join(' / ')}
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  </dd>
                </div>
              ) : row.answer?.length ? (
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
