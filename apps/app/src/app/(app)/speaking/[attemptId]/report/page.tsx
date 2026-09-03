import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { requireUserId } from '@/lib/auth';
import { getSpeakingReport } from '@/lib/db/queries';
import { GradingWatch } from '@/components/app/grading-watch';
import type { Annotation } from '@/lib/db/schema';
import { retrySpeakingGrading } from '../../actions';

export const metadata = { title: 'Speaking report' };

const ANNOTATION_STYLE: Record<Annotation['kind'], string> = {
  good: 'border-primary',
  grammar: 'border-destructive',
  vocabulary: 'border-chrome',
  fluency: 'border-chrome',
  development: 'border-chrome',
};

const ANNOTATION_LABEL: Record<Annotation['kind'], string> = {
  good: 'Works well',
  grammar: 'Grammar',
  vocabulary: 'Word choice',
  fluency: 'Fluency',
  development: 'Needs support',
};

const PART_LABEL: Record<number, string> = {
  1: 'Part 1',
  2: 'Part 2',
  3: 'Part 3',
};

export default async function SpeakingReportPage({
  params,
}: PageProps<'/speaking/[attemptId]/report'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getSpeakingReport(userId, attemptId);
  if (!data) notFound();

  const { attempt, report, responses } = data;

  if (attempt.status === 'grading' || attempt.status === 'in_progress') {
    return (
      <div className="max-w-md space-y-4">
        <GradingWatch attemptId={attemptId} />
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Marking
        </p>
        <h1 className="font-title text-title-lg">Listening to your answers</h1>
        <p className="text-sm text-muted-foreground">
          This takes a minute or two — the examiner listens to every answer. You
          can close this tab; the report will be here when you come back.
        </p>
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
        <p className="text-sm text-pretty text-muted-foreground">
          Your recordings are saved and nothing has been lost. Marking again
          costs you nothing.
        </p>
        <form action={retrySpeakingGrading}>
          <input type="hidden" name="attemptId" value={attemptId} />
          <Button type="submit">Mark it again</Button>
        </form>
      </div>
    );
  }

  if (!report) notFound();

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Speaking report
        </p>
        <div className="flex items-baseline gap-4">
          <span className="font-metric text-metric-lg">
            {report.band.toFixed(1)}
          </span>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Estimate, not an official score
          </span>
        </div>
        <BandScale value={report.band} label="Speaking" />
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
          <h2 className="mb-3 font-title text-title">In your answers</h2>
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

      <section className="space-y-3">
        <h2 className="font-title text-title">Your answers</h2>
        {responses.map((r) => (
          <details key={r.promptId} className="border-t border-border pt-3">
            <summary className="cursor-pointer text-sm">
              <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                {PART_LABEL[r.part] ?? `Part ${r.part}`} ·{' '}
              </span>
              {r.promptText}
            </summary>
            <div className="mt-3 space-y-3">
              <audio controls src={r.audioUrl} className="w-full" />
              {r.transcript ? (
                <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
                  {r.transcript}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Transcript unavailable for this answer.
                </p>
              )}
            </div>
          </details>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button nativeButton={false} render={<Link href="/speaking" />}>
          Practise another test
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
