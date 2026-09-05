import type { ReactNode } from 'react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { Progress } from '@bandzen/ui/components/progress';
import { cn } from '@bandzen/ui/lib/utils';
import { GradingWatch } from '@/components/app/grading-watch';
import { InsightBar, Watermark } from '@/components/app/primitives';
import { BandReveal } from '@/components/exam/band-reveal';
import type { Annotation } from '@/lib/db/schema';

/**
 * The writing and speaking report pages share every state: a "marking" hold, a
 * "marking failed" retry, and a complete report — animated band, criteria
 * scales, strengths / needs-work, and the annotation list. This is that
 * shared shell; each page passes its own copy and its own tail (the essay
 * disclosure for writing, the per-answer audio for speaking).
 */

const ANNOTATION_BORDER: Record<Annotation['kind'], string> = {
  good: 'border-primary',
  grammar: 'border-destructive',
  development: 'border-chrome',
  vocabulary: 'border-chrome',
  fluency: 'border-chrome',
};

const ANNOTATION_LABEL: Record<Annotation['kind'], string> = {
  good: 'Works well',
  grammar: 'Grammar',
  development: 'Needs support',
  vocabulary: 'Word choice',
  fluency: 'Fluency',
};

export type GradedReportData = {
  band: number;
  criteria: { name: string; band: number; comment: string }[];
  strengths: string[];
  weaknesses: string[];
  annotations: { kind: Annotation['kind']; quote: string; comment: string }[];
};

export function GradedReport({
  moduleLabel,
  attemptId,
  status,
  retryAction,
  grading,
  report,
  annotationScope,
  children,
}: {
  moduleLabel: string;
  attemptId: string;
  status: string;
  retryAction: (formData: FormData) => void;
  /** Copy for the "marking" hold — differs by module. */
  grading: { title: string; note: string };
  /** The complete report, or null for the grading / failed states. */
  report: GradedReportData | null;
  /** "In your response" (writing) or "In your answers" (speaking). */
  annotationScope: string;
  /** The module-specific tail: essay disclosure, per-answer audio, footer. */
  children?: ReactNode;
}) {
  if (status === 'grading' || status === 'in_progress') {
    return (
      <div className="max-w-md space-y-4">
        <GradingWatch attemptId={attemptId} />
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Marking
        </p>
        <h1 className="font-title text-title-lg">{grading.title}</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          {grading.note}
        </p>
        {/* Indeterminate — a fake percentage is a lie about progress. */}
        <Progress
          value={null}
          className="[&_[data-slot=progress-track]]:h-px"
          indicatorClassName="w-1/3 animate-pulse"
        />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="font-title text-title-lg">Marking failed</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          Your work is saved and nothing has been lost. Marking again costs you
          nothing — a failed run has never counted against your weekly marks.
        </p>
        <form action={retryAction}>
          <input type="hidden" name="attemptId" value={attemptId} />
          <Button type="submit">Mark it again</Button>
        </form>
        {children}
      </div>
    );
  }

  if (!report) return null;

  // The grader already wrote a per-criterion comment — the lowest-band one is
  // the same "biggest opportunity" derivation `lib/insight.ts` uses.
  const worst = report.criteria.length
    ? report.criteria.reduce((low, c) => (c.band < low.band ? c : low))
    : null;

  return (
    <div className="relative isolate max-w-3xl space-y-10 overflow-clip">
      <Watermark text={moduleLabel} />
      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {moduleLabel} report
        </p>
        <BandReveal value={report.band} label={moduleLabel} />
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Estimate, not an official score
        </p>
        {worst ? (
          <InsightBar>
            {worst.name} is the criterion holding this response at{' '}
            {worst.band.toFixed(1)}.
          </InsightBar>
        ) : null}
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
          <h2 className="mb-3 font-title text-title">{annotationScope}</h2>
          <ul className="space-y-4">
            {report.annotations.map((a, i) => (
              <li
                key={i}
                className={cn('border-l-2 pl-4', ANNOTATION_BORDER[a.kind])}
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

      {children}
    </div>
  );
}
