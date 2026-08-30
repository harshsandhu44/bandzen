import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { cn } from '@bandzen/ui/lib/utils';
import { requireUserId } from '@/lib/auth';
import {
  getAttempt,
  getReadingReview,
  isAnswerCorrect,
} from '@/lib/db/queries';

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

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Review · {data.passage.title}
        </p>
        <div className="flex items-baseline gap-4">
          <span className="font-metric text-metric-lg">
            {attempt.band?.toFixed(1)}
          </span>
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
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
                    <p className="text-xs leading-6 text-muted-foreground">
                      {q.explanation}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        href="/reading"
        className="inline-block font-mono text-xs tracking-widest text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground"
      >
        Back to passages
      </Link>
    </div>
  );
}
