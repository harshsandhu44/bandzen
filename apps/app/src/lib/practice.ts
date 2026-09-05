import 'server-only';

import {
  accuracyByQuestionKind,
  diagnosticCount,
  latestBand,
} from '@/lib/db/queries';
import {
  IELTS_MODULES,
  MODULE_LABEL,
  QUESTION_KIND_LABEL,
  type IELTSModule,
  type QuestionKind,
} from '@/lib/modules';

/**
 * Cross-module state for the Practice hub, a sibling to `lib/learn.ts`. The
 * module pages (`/reading`, `/writing`, …) still own their own passage lists;
 * this is the four-module summary the hub needs and the one recommendation it
 * leads with.
 */

/** Below this an accuracy rate is a bad day, not a weakness. */
const MIN_ATTEMPTED = 5;
const WEAK_BELOW = 0.75;

export type PracticeModuleOverview = {
  module: IELTSModule;
  band: number | null;
  /** Question accuracy across every completed attempt in this module. */
  correct: number;
  total: number;
};

export async function practiceOverview(
  userId: string,
): Promise<PracticeModuleOverview[]> {
  const [accuracy, ...bands] = await Promise.all([
    accuracyByQuestionKind(userId),
    ...IELTS_MODULES.map((m) => latestBand(userId, m)),
  ]);

  return IELTS_MODULES.map((module, i) => {
    const kinds = accuracy.filter((k) => k.module === module);
    return {
      module,
      band: bands[i] ?? null,
      correct: kinds.reduce((n, k) => n + k.correct, 0),
      total: kinds.reduce((n, k) => n + k.total, 0),
    };
  });
}

export type PracticeNextStep =
  | {
      kind: 'weakness';
      module: IELTSModule;
      href: string;
      title: string;
      reason: string;
    }
  | { kind: 'diagnostic'; href: string; title: string; reason: string }
  | null;

/**
 * The hub's "Start next": the weakest question type your own answers point to,
 * else the diagnostic if you have never sat one, else nothing — a candidate
 * with a broad record does not need to be told what to do.
 */
export async function nextPracticeStep(
  userId: string,
): Promise<PracticeNextStep> {
  const [accuracy, taken] = await Promise.all([
    accuracyByQuestionKind(userId),
    diagnosticCount(userId),
  ]);

  const weakest = accuracy
    .filter((k) => k.total >= MIN_ATTEMPTED && k.accuracy < WEAK_BELOW)
    .sort((a, b) => a.accuracy - b.accuracy)[0];

  if (weakest) {
    const label =
      QUESTION_KIND_LABEL[weakest.kind as QuestionKind] ?? weakest.kind;
    const pct = Math.round(weakest.accuracy * 100);
    return {
      kind: 'weakness',
      module: weakest.module,
      href: `/${weakest.module}?kind=${weakest.kind}`,
      title: label,
      reason: `${MODULE_LABEL[weakest.module]} · ${pct}% over ${weakest.total} questions`,
    };
  }

  if (taken === 0) {
    return {
      kind: 'diagnostic',
      href: '/diagnostic',
      title: 'Take the diagnostic',
      reason: 'A timed four-skill sitting — your fastest first estimate',
    };
  }

  return null;
}
