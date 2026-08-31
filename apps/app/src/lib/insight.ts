import { QUESTION_KIND_LABEL, type IELTSModule } from './modules.ts';
import type { Criterion } from '@/lib/db/schema';

/**
 * The single thing most worth fixing next.
 *
 * Everything here is read off evidence we already hold: the grader's own
 * per-criterion comment, or the candidate's measured accuracy on one question
 * kind. Nothing is generated for this component and nothing is estimated —
 * in particular there is no "6.0 → 6.5 opportunity" figure, because we have no
 * basis on which to promise a gain.
 *
 * The shape is what an OpenAI evaluator would return, so a generated insight
 * can replace a derived one later without touching the component.
 */
export type PerformanceInsight = {
  /** The area, named the way the candidate sees it elsewhere in the app. */
  focus: string;
  module: IELTSModule;
  summary: string;
  /** Supporting numbers, already formatted. Never a projection. */
  evidence: string[];
  action: { label: string; href: string };
};

export type InsightSources = {
  readingBand: number | null;
  writingBand: number | null;
  criteria: Criterion[] | null;
  kindAccuracy: readonly {
    kind: string;
    correct: number;
    total: number;
    accuracy: number;
  }[];
};

/** Below this, a rate is noise rather than a pattern. */
const MIN_ATTEMPTED = 5;

export function buildInsight(
  sources: InsightSources,
): PerformanceInsight | null {
  const { readingBand, writingBand } = sources;

  // Compare like with like: pick the weaker module by its own band, then find
  // the worst thing inside it. Ranking a criterion band against an accuracy
  // percentage would need a conversion we have no evidence for.
  const weakest =
    readingBand != null && writingBand != null
      ? writingBand <= readingBand
        ? 'writing'
        : 'reading'
      : writingBand != null
        ? 'writing'
        : readingBand != null
          ? 'reading'
          : null;

  if (weakest === 'writing') {
    const insight = fromCriteria(sources.criteria);
    if (insight) return insight;
  }
  if (weakest === 'reading') {
    const insight = fromAccuracy(sources.kindAccuracy);
    if (insight) return insight;
  }

  // The weaker module had nothing specific to say -- fall back to the other
  // rather than showing nothing at all.
  return fromCriteria(sources.criteria) ?? fromAccuracy(sources.kindAccuracy);
}

function fromCriteria(criteria: Criterion[] | null): PerformanceInsight | null {
  if (!criteria?.length) return null;

  const worst = criteria.reduce((low, c) => (c.band < low.band ? c : low));
  return {
    focus: worst.name,
    module: 'writing',
    // The grader already wrote a sentence about this criterion. Rewriting it
    // here would be a second opinion nobody asked for.
    summary: worst.comment,
    evidence: [`Estimated Band ${worst.band.toFixed(1)} on ${worst.name}`],
    action: { label: 'Practise writing', href: '/writing' },
  };
}

function fromAccuracy(
  kinds: InsightSources['kindAccuracy'],
): PerformanceInsight | null {
  const eligible = kinds.filter((k) => k.total >= MIN_ATTEMPTED);
  if (!eligible.length) return null;

  const worst = eligible.reduce((low, k) =>
    k.accuracy < low.accuracy ? k : low,
  );
  const label =
    QUESTION_KIND_LABEL[worst.kind as keyof typeof QUESTION_KIND_LABEL] ??
    worst.kind;

  return {
    focus: label,
    module: 'reading',
    summary: `${label} questions are costing you the most marks in Reading. Your other question types are stronger, so this is where the next band is.`,
    evidence: [
      `${worst.correct} of ${worst.total} correct — ${Math.round(worst.accuracy * 100)}%`,
    ],
    action: {
      label: 'Practise reading',
      href: `/reading?kind=${worst.kind}`,
    },
  };
}
