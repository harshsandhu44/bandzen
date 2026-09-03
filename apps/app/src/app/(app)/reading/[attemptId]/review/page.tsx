import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Check, Repeat, X } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { SectionHeader } from '@/components/app/primitives';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  getAttempt,
  getReadingReview,
  isAnswerCorrect,
} from '@/lib/db/queries';
import { QUESTION_KIND_LABEL } from '@/lib/modules';

/** Below this, a run of wrong answers is a bad day rather than a pattern. */
const MIN_ATTEMPTED = 5;

export const metadata = { title: 'Review' };

export default async function ReviewPage({
  params,
}: PageProps<'/reading/[attemptId]/review'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status !== 'complete') redirect(`/reading/${attemptId}`);

  const data = await getReadingReview(userId, attemptId);
  if (!data) notFound();

  // Accuracy across every attempt, so a mistake made here can be named as a
  // recurring one -- or not named at all, when the history is too thin.
  const history = await accuracyByQuestionKind(userId, 'reading');
  const byKind = new Map(history.map((k) => [k.kind, k]));

  const label = (kind: string) =>
    QUESTION_KIND_LABEL[kind as keyof typeof QUESTION_KIND_LABEL] ?? kind;

  const missedKinds = [
    ...new Set(
      data.rows
        .filter((q) => !isAnswerCorrect(q.answer, q.given))
        .map((q) => q.kind),
    ),
  ];

  const patterns = missedKinds
    .map((kind) => ({ kind, stats: byKind.get(kind) }))
    .filter(
      (p) =>
        p.stats && p.stats.total >= MIN_ATTEMPTED && p.stats.accuracy < 0.75,
    );

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Review · {data.passage.title}
        </p>
        <div className="flex items-baseline gap-4">
          <span className="font-metric text-metric-lg">
            {attempt.band?.toFixed(1)}
          </span>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            {attempt.rawScore}/{attempt.total} correct · estimate, not an
            official score
          </span>
        </div>
        {attempt.band != null ? (
          <BandScale value={attempt.band} label="Reading" />
        ) : null}
      </header>

      <ol className="divide-y divide-border border-y border-border">
        {data.rows.map((q) => {
          const correct = isAnswerCorrect(q.answer, q.given);
          return (
            <li key={q.id} className="py-5">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center',
                    correct ? 'text-primary' : 'text-destructive',
                  )}
                  aria-label={correct ? 'Correct' : 'Incorrect'}
                >
                  {correct ? (
                    <Check className="size-4" />
                  ) : (
                    <X className="size-4" />
                  )}
                </span>

                <div className="flex-1 space-y-2">
                  <p className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(q.idx).padStart(2, '0')}{' '}
                    </span>
                    {q.prompt}
                  </p>

                  <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {label(q.kind)}
                  </p>

                  <p className="font-mono text-xs">
                    <span className="text-muted-foreground">Your answer </span>
                    <span className={correct ? '' : 'text-destructive'}>
                      {q.given || '—'}
                    </span>
                    {!correct ? (
                      <>
                        <span className="text-muted-foreground">
                          {' '}
                          · Correct{' '}
                        </span>
                        <span className="text-primary">{q.answer[0]}</span>
                      </>
                    ) : null}
                  </p>

                  {!correct && q.evidence ? (
                    <blockquote className="border-l-2 border-chrome pl-3 text-xs leading-6 text-muted-foreground">
                      {q.evidence}
                    </blockquote>
                  ) : null}
                  {!correct && q.explanation ? (
                    <div className="space-y-1">
                      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                        Why
                      </p>
                      <p className="text-xs leading-6 text-muted-foreground">
                        {q.explanation}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {patterns.length ? (
        <section aria-labelledby="patterns-heading" className="space-y-3">
          <SectionHeader as="h2">
            <span id="patterns-heading">Pattern detected</span>
          </SectionHeader>

          <ul className="space-y-3">
            {patterns.map(({ kind, stats }) => (
              <li
                key={kind}
                className="flex items-start gap-3 border-l-2 border-chrome py-3 pr-4 pl-4"
              >
                <Repeat
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm">
                    You have missed{' '}
                    <strong className="font-medium">
                      {stats!.total - stats!.correct} of {stats!.total}
                    </strong>{' '}
                    {label(kind)} questions across every attempt so far. This
                    one was not a one-off.
                  </p>
                  <Link
                    href={`/reading?kind=${kind}`}
                    className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
                  >
                    Practise {label(kind)}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button
          nativeButton={false}
          render={
            <Link
              href={
                patterns[0] ? `/reading?kind=${patterns[0].kind}` : '/reading'
              }
            />
          }
        >
          {patterns[0]
            ? `Practise ${label(patterns[0].kind)}`
            : 'Practise another passage'}
          <ArrowRight />
        </Button>
        <Link
          href="/progress"
          className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground"
        >
          All reviews
        </Link>
      </div>
    </div>
  );
}
