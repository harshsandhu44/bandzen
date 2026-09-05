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

type KindAccuracy = readonly {
  kind: string;
  correct: number;
  total: number;
  accuracy: number;
}[];

export type InsightSources = {
  readingBand: number | null;
  writingBand: number | null;
  listeningBand?: number | null;
  criteria: Criterion[] | null;
  kindAccuracy: KindAccuracy;
  listeningAccuracy?: KindAccuracy;
};

/** Below this, a rate is noise rather than a pattern. */
const MIN_ATTEMPTED = 5;

export function buildInsight(
  sources: InsightSources,
): PerformanceInsight | null {
  const { readingBand, writingBand } = sources;
  const listeningBand = sources.listeningBand ?? null;
  const listeningAccuracy = sources.listeningAccuracy ?? [];

  // Compare like with like: pick the weakest measured module by its own band,
  // then find the worst thing inside it. Ranking a criterion band against an
  // accuracy percentage would need a conversion we have no evidence for.
  const measured = (
    [
      ['reading', readingBand],
      ['writing', writingBand],
      ['listening', listeningBand],
    ] as const
  ).filter((m): m is [typeof m[0], number] => m[1] != null);
  const weakest = measured.length
    ? measured.reduce((low, m) => (m[1] < low[1] ? m : low))[0]
    : null;

  if (weakest === 'writing') {
    const insight = fromCriteria(sources.criteria);
    if (insight) return insight;
  }
  if (weakest === 'reading') {
    const insight = fromAccuracy(sources.kindAccuracy, 'reading');
    if (insight) return insight;
  }
  if (weakest === 'listening') {
    const insight = fromAccuracy(listeningAccuracy, 'listening');
    if (insight) return insight;
  }

  // The weakest module had nothing specific to say -- fall back to whatever
  // does rather than showing nothing at all.
  return (
    fromCriteria(sources.criteria) ??
    fromAccuracy(sources.kindAccuracy, 'reading') ??
    fromAccuracy(listeningAccuracy, 'listening')
  );
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
  kinds: KindAccuracy,
  module: 'reading' | 'listening',
): PerformanceInsight | null {
  const eligible = kinds.filter((k) => k.total >= MIN_ATTEMPTED);
  if (!eligible.length) return null;

  const worst = eligible.reduce((low, k) =>
    k.accuracy < low.accuracy ? k : low,
  );
  const label =
    QUESTION_KIND_LABEL[worst.kind as keyof typeof QUESTION_KIND_LABEL] ??
    worst.kind;
  const moduleLabel = module === 'reading' ? 'Reading' : 'Listening';

  return {
    focus: label,
    module,
    summary: `${label} questions are costing you the most marks in ${moduleLabel}. Your other question types are stronger, so this is where the next band is.`,
    evidence: [
      `${worst.correct} of ${worst.total} correct — ${Math.round(worst.accuracy * 100)}%`,
    ],
    action: {
      label: `Practise ${module}`,
      href: `/${module}?kind=${worst.kind}`,
    },
  };
}
