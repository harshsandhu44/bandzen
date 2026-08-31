import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { cn } from '@bandzen/ui/lib/utils';
import { requireUserId } from '@/lib/auth';
import { getReport } from '@/lib/db/queries';
import type { Annotation } from '@/lib/db/schema';
import { GradingWatch } from '@/components/app/grading-watch';

export const metadata = { title: 'Writing report' };

const ANNOTATION_STYLE: Record<Annotation['kind'], string> = {
  good: 'border-primary',
  grammar: 'border-destructive',
  development: 'border-chrome',
};

const ANNOTATION_LABEL: Record<Annotation['kind'], string> = {
  good: 'Works well',
  grammar: 'Error',
  development: 'Needs support',
};

export default async function ReportPage({
  params,
}: PageProps<'/writing/[attemptId]/report'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getReport(userId, attemptId);
  if (!data) notFound();

  const { attempt, report, essay } = data;

  if (attempt.status === 'grading' || attempt.status === 'in_progress') {
    return (
      <div className="max-w-md space-y-4">
        <GradingWatch attemptId={attemptId} />
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Marking
        </p>
        <h1 className="font-title text-title-lg">Reading your response</h1>
        <p className="text-sm text-muted-foreground">
          This takes up to a minute. You can close this tab — the report will be
          here when you come back.
        </p>
        {/* Indeterminate, because a fake percentage is a lie about progress. */}
        <div className="h-px w-full overflow-hidden bg-border">
          <div className="h-px w-1/3 animate-pulse bg-primary" />
        </div>
      </div>
    );
  }

  if (attempt.status === 'failed') {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="font-title text-title-lg">Marking failed</h1>
        <p className="text-sm text-muted-foreground">
          Your response is saved. Try submitting again from{' '}
          <Link href="/writing" className="underline underline-offset-4">
            Writing
          </Link>
          .
        </p>
      </div>
    );
  }

  if (!report) notFound();

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Writing report
        </p>
        <div className="flex items-baseline gap-4">
          <span className="font-metric text-metric-lg">
            {report.band.toFixed(1)}
          </span>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Estimate, not an official score
          </span>
        </div>
        <BandScale value={report.band} label="Writing" />
      </header>

      <section className="space-y-6">
        <h2 className="font-title text-title">By criterion</h2>
        {report.criteria.map((c) => (
          <div key={c.name} className="space-y-2">
            <BandScale value={c.band} label={c.name} />
            <p className="text-sm leading-6 text-muted-foreground">
              {c.comment}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 font-title text-title">Strengths</h2>
          <ul className="space-y-2 text-sm">
            {report.strengths.map((s) => (
              <li key={s} className="border-l-2 border-primary pl-3">
                {s}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-title text-title">Needs work</h2>
          <ul className="space-y-2 text-sm">
            {report.weaknesses.map((w) => (
              <li key={w} className="border-l-2 border-chrome pl-3">
                {w}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {report.annotations.length ? (
        <section>
          <h2 className="mb-3 font-title text-title">In your response</h2>
          <ul className="space-y-4">
            {report.annotations.map((a, i) => (
              <li
                key={i}
                className={cn('border-l-2 pl-4', ANNOTATION_STYLE[a.kind])}
              >
                <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                  {ANNOTATION_LABEL[a.kind]}
                </p>
                <blockquote className="mt-1 text-sm leading-6 italic">
                  &ldquo;{a.quote}&rdquo;
                </blockquote>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {a.comment}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {essay ? (
        <details className="border-t border-border pt-6">
          <summary className="cursor-pointer font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Your response · {essay.wordCount} words
          </summary>
          <p className="mt-4 text-sm leading-7 whitespace-pre-wrap">
            {essay.body}
          </p>
        </details>
      ) : null}
    </div>
  );
}
