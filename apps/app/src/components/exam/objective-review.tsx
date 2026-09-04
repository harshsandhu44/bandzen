import Link from 'next/link';
import { ArrowRight, Check, Repeat, X } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import {
  InsightBar,
  SectionHeader,
  Watermark,
} from '@/components/app/primitives';
import { BandReveal } from '@/components/exam/band-reveal';
import { isAnswerCorrect } from '@/lib/db/queries';
import {
  MODULE_LABEL,
  QUESTION_KIND_LABEL,
  type IELTSModule,
} from '@/lib/modules';

/** Below this, a run of wrong answers is a bad day rather than a pattern. */
const MIN_ATTEMPTED = 5;

export type ReviewRow = {
  id: string;
  idx: number;
  kind: string;
  prompt: string;
  given: string | null;
  /** Accepted answers, correct one first. */
  answer: string[];
  evidence: string | null;
  explanation: string | null;
};

type KindAccuracy = {
  kind: string;
  correct: number;
  total: number;
  accuracy: number;
};

const label = (kind: string) =>
  QUESTION_KIND_LABEL[kind as keyof typeof QUESTION_KIND_LABEL] ?? kind;

/**
 * The reading and listening review pages were ~95% the same. This is the
 * shared body: the animated band header, the per-question `Check` / `X` list
 * with evidence and "why", the cross-attempt "pattern detected" section, and
 * (listening only) the transcript.
 */
export function ObjectiveReview({
  module,
  title,
  band,
  target,
  rawScore,
  total,
  rows,
  history,
  transcript,
}: {
  module: IELTSModule;
  title: string;
  band: number | null;
  target?: number;
  rawScore: number | null;
  total: number | null;
  rows: ReviewRow[];
  /** `accuracyByQuestionKind(userId, module)` — for naming a recurring miss. */
  history: KindAccuracy[];
  transcript?: string | null;
}) {
  const byKind = new Map(history.map((k) => [k.kind, k]));
  const noun = module === 'listening' ? 'track' : 'passage';

  const missedKinds = [
    ...new Set(
      rows
        .filter((q) => !isAnswerCorrect(q.answer, q.given))
        .map((q) => q.kind),
    ),
  ];
  const patterns = missedKinds
    .map((kind) => ({ kind, stats: byKind.get(kind) }))
    .filter(
      (p): p is { kind: string; stats: KindAccuracy } =>
        !!p.stats && p.stats.total >= MIN_ATTEMPTED && p.stats.accuracy < 0.75,
    );

  const practiceHref = patterns[0]
    ? `/${module}?kind=${patterns[0].kind}`
    : `/${module}`;

  return (
    <div className="relative isolate max-w-3xl space-y-10 overflow-clip">
      <Watermark text={module} />
      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Review · {title}
        </p>
        {band != null ? (
          <BandReveal
            value={band}
            target={target}
            label={MODULE_LABEL[module]}
          />
        ) : (
          <p className="font-metric text-metric-lg">—</p>
        )}
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {rawScore}/{total} correct · estimate, not an official score
        </p>
      </header>

      <ol className="divide-y divide-border border-y border-border">
        {rows.map((q) => {
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
                    <InsightBar>{q.explanation}</InsightBar>
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
              <li key={kind}>
                <InsightBar icon={Repeat}>
                  You have missed{' '}
                  <strong className="font-medium">
                    {stats.total - stats.correct} of {stats.total}
                  </strong>{' '}
                  {label(kind)} questions across every attempt so far. This one
                  was not a one-off.{' '}
                  <Link
                    href={`/${module}?kind=${kind}`}
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    Practise {label(kind)}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </InsightBar>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {transcript ? (
        <section aria-labelledby="transcript-heading" className="space-y-3">
          <SectionHeader as="h2">
            <span id="transcript-heading">Transcript</span>
          </SectionHeader>
          {transcript.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="text-sm leading-7 whitespace-pre-line">
              {para}
            </p>
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button nativeButton={false} render={<Link href={practiceHref} />}>
          {patterns[0]
            ? `Practise ${label(patterns[0].kind)}`
            : `Practise another ${noun}`}
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
