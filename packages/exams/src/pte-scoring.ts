import { getExam, getTask } from './registry.ts';
import { roundToScale } from './scale.ts';
import type { ExamScoreReport } from './scoring.ts';
import type { Skill } from './types.ts';

/**
 * PTE Academic's estimate: per-task evidence aggregated onto the 10-90 scale.
 *
 * Pearson does not publish how its traits and raw marks combine into a score,
 * so this cannot reproduce it and does not pretend to. What it does is honest
 * and calibratable: turn each task into a fraction of what it was worth, share
 * that fraction across the skills the task actually measures — eight of PTE's
 * 22 types are integrated, so Repeat Sentence counts towards listening AND
 * speaking — and map the weighted result onto 10-90.
 *
 * Every number this produces is a Bandzen estimate. `PTE_SCORING_VERSION` is
 * stamped alongside it so a later comparison against real results knows which
 * arithmetic produced which estimate.
 */

export const PTE_SCORING_VERSION = 'pte-2025-08-07.v1';

/** The most a trait is worth; the rubrics ask for 0-5 whole points. */
const TRAIT_MAX = 5;

/**
 * One marked task's contribution. Structurally an `AssessmentResult`, so an
 * attempt's stored assessment can be passed straight in.
 */
export type TaskOutcome = {
  taskType: string;
  dimensions: Record<string, number | null>;
  measuredSkills: readonly { skill: Skill; weight: number }[];
};

/**
 * How much of the task the candidate got, 0 to 1.
 *
 * A deterministic task stores marks (`correct` of `total`); a model-graded one
 * stores traits out of five. Null when there is nothing to read — an
 * unanswered or ungraded task, which must not be scored as a zero, because a
 * task nobody marked is not the same as a task marked badly.
 */
export function taskFraction(outcome: TaskOutcome): number | null {
  const { correct, total } = outcome.dimensions;
  // Both halves, not just the denominator. A marked task writes them together,
  // so `total` with a null `correct` is a task that was never marked — and
  // `correct ?? 0` would have scored it a flat zero, which is the one answer
  // this function exists to avoid giving.
  if (typeof total === 'number' && total > 0 && typeof correct === 'number') {
    return Math.min(1, Math.max(0, correct / total));
  }
  const traits = Object.entries(outcome.dimensions)
    .filter(([name]) => name !== 'correct' && name !== 'total')
    .map(([, value]) => value)
    .filter((v): v is number => typeof v === 'number');
  if (!traits.length) return null;
  const mean = traits.reduce((a, b) => a + b, 0) / traits.length;
  return Math.min(1, Math.max(0, mean / TRAIT_MAX));
}

/** A fraction of the way up the exam's own scale. */
function onScale(fraction: number): number {
  const scale = getExam('pte_academic')!.scoreScale;
  return roundToScale(scale, scale.min + fraction * (scale.max - scale.min));
}

/**
 * Each skill's weighted fraction, or null where nothing measured it. A task
 * measuring two skills contributes its weight to both, which is what keeps an
 * integrated task from being filed under one skill and lost to the other.
 */
export function pteSkillFractions(
  outcomes: readonly TaskOutcome[],
): Record<Skill, number | null> {
  const got: Record<string, number> = {};
  const possible: Record<string, number> = {};

  for (const outcome of outcomes) {
    const fraction = taskFraction(outcome);
    if (fraction == null) continue;
    for (const { skill, weight } of outcome.measuredSkills) {
      got[skill] = (got[skill] ?? 0) + weight * fraction;
      possible[skill] = (possible[skill] ?? 0) + weight;
    }
  }

  const fractions = {} as Record<Skill, number | null>;
  for (const skill of [
    'reading',
    'writing',
    'listening',
    'speaking',
  ] as const) {
    const total = possible[skill] ?? 0;
    fractions[skill] = total > 0 ? (got[skill] ?? 0) / total : null;
  }
  return fractions;
}

/** The task types sat, worst first — what a study plan should point at. */
export function pteWeakestTaskTypes(
  outcomes: readonly TaskOutcome[],
): { taskType: string; fraction: number }[] {
  const byType = new Map<string, number[]>();
  for (const outcome of outcomes) {
    const fraction = taskFraction(outcome);
    if (fraction == null) continue;
    byType.set(outcome.taskType, [
      ...(byType.get(outcome.taskType) ?? []),
      fraction,
    ]);
  }
  return [...byType]
    .map(([taskType, fs]) => ({
      taskType,
      fraction: fs.reduce((a, b) => a + b, 0) / fs.length,
    }))
    .sort((a, b) => a.fraction - b.fraction);
}

/**
 * The sitting's estimate: overall, per skill, and per section.
 *
 * Overall is the mean of the skills actually measured, not of four assumed
 * ones — a candidate who sat only Reading gets a Reading estimate and no
 * invented Listening score.
 *
 * The mean is a placeholder. Pearson's score guide says outright that the
 * overall score is not an average of the communicative skills scores, and does
 * not publish what it is instead, so closing that gap needs paired real
 * results rather than a better reading of the guide — see issue #121.
 */
export function pteScoreReport(
  outcomes: readonly TaskOutcome[],
): ExamScoreReport {
  const exam = getExam('pte_academic')!;
  const fractions = pteSkillFractions(outcomes);

  const sections: Record<string, number | null> = {};
  for (const section of exam.sections) {
    const inSection = outcomes.filter(
      (o) => getTask('pte_academic', o.taskType)?.section === section.key,
    );
    const got = inSection
      .map(taskFraction)
      .filter((f): f is number => f != null);
    sections[section.key] = got.length
      ? onScale(got.reduce((a, b) => a + b, 0) / got.length)
      : null;
  }

  const skills = {} as Record<string, number | null>;
  for (const [skill, fraction] of Object.entries(fractions)) {
    skills[skill] = fraction == null ? null : onScale(fraction);
  }

  const measured = Object.values(skills).filter((s): s is number => s != null);

  return {
    overall: measured.length
      ? roundToScale(
          exam.scoreScale,
          measured.reduce((a, b) => a + b, 0) / measured.length,
        )
      : null,
    sections,
    subscores: skills,
    scale: exam.scoreScale,
    estimated: true,
  };
}
