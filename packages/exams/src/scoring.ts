import { getTask } from './registry.ts';
import type { EvaluatorKey, ExamKey, ScoreScale, Skill } from './types.ts';

export * from './ielts-scoring.ts';
export * from './pte-scoring.ts';
export { formatScore, roundToScale } from './scale.ts';

/**
 * The one result shape every grader produces, deterministic or model-based,
 * for any exam: the score on the exam's own scale, the named dimensions behind
 * it, which skills it counts towards, and the feedback.
 */
export type SkillContribution = { skill: Skill; weight: number };

export type FeedbackItem = { quote: string; kind: string; comment: string };

export type AssessmentResult = {
  exam: ExamKey;
  examVersion: string;
  taskType: string;
  score: number | null;
  dimensions: Record<string, number | null>;
  measuredSkills: SkillContribution[];
  strengths: string[];
  weaknesses: string[];
  feedback: FeedbackItem[];
};

/** An exam-level report. Always a Bandzen estimate, never an official score. */
export type ExamScoreReport = {
  overall: number | null;
  sections: Record<string, number | null>;
  subscores?: Record<string, number | null>;
  scale: ScoreScale;
  estimated: true;
};

/** How every result that is not an official score is labelled, everywhere. */
export const ESTIMATE_NOTE = 'Bandzen estimate, not an official score';

/** Equal credit to each skill a task measures. */
export function evenContributions(
  skills: readonly Skill[],
): SkillContribution[] {
  return skills.map((skill) => ({ skill, weight: 1 / skills.length }));
}

/**
 * The skills an attempt counts towards: its task definition's, or — for an
 * attempt-level unit such as an IELTS reading passage, which is not itself a
 * task definition — the module it was sat in.
 */
export function measuredSkillsFor(
  exam: ExamKey,
  taskType: string | null,
  fallback: Skill,
): SkillContribution[] {
  const task = taskType ? getTask(exam, taskType) : null;
  return evenContributions(task?.measuredSkills ?? [fallback]);
}

// ---------------------------------------------------------------------------
// Evaluators
// ---------------------------------------------------------------------------

export const EVALUATOR_KIND = {
  exact_match: 'deterministic',
  multi_match: 'deterministic',
  order_match: 'deterministic',
  gap_match: 'deterministic',
  dictation_match: 'deterministic',
  writing_model: 'model',
  speaking_model: 'model',
} as const satisfies Record<EvaluatorKey, 'deterministic' | 'model'>;

type DeterministicKey = {
  [K in EvaluatorKey]: (typeof EVALUATOR_KIND)[K] extends 'deterministic'
    ? K
    : never;
}[EvaluatorKey];

/** Marks earned out of marks available for one response. */
export type Marks = { correct: number; total: number };

const normalise = (s: string) => s.trim().toLowerCase();

const parseList = (given: string | null | undefined): string[] => {
  if (!given) return [];
  try {
    const parsed: unknown = JSON.parse(given);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

/**
 * A key holds every accepted form, so "cotton" and "raw cotton" can both be
 * right. Comparison ignores case and surrounding whitespace, because a
 * candidate typing "  TRUE " has not made a mistake.
 */
export function isAnswerCorrect(
  key: readonly string[],
  given: string | null | undefined,
): boolean {
  if (!given?.trim()) return false;
  return key.some((accepted) => normalise(accepted) === normalise(given));
}

/**
 * The deterministic markers, keyed by evaluator. Each takes the answer key and
 * the candidate's stored response string (see the renderers for its format).
 */
export const DETERMINISTIC_EVALUATORS: Record<
  DeterministicKey,
  (key: readonly string[], given: string | null | undefined) => Marks
> = {
  exact_match: (key, given) => ({
    correct: isAnswerCorrect(key, given) ? 1 : 0,
    total: 1,
  }),
  // PTE's rule: a mark per correct option, minus one per wrong one, never
  // below zero — so ticking everything scores nothing.
  multi_match: (key, given) => {
    const accepted = new Set(key.map(normalise));
    const picked = parseList(given).map(normalise);
    const right = picked.filter((p) => accepted.has(p)).length;
    return {
      correct: Math.max(0, right - (picked.length - right)),
      total: key.length,
    };
  },
  // A mark per adjacent pair placed in the right relative order.
  order_match: (key, given) => {
    const order = parseList(given);
    const pairs = new Set(key.slice(1).map((k, i) => `${key[i]}>${k}`));
    const correct = order
      .slice(1)
      .filter((o, i) => pairs.has(`${order[i]}>${o}`)).length;
    return { correct, total: Math.max(0, key.length - 1) };
  },
  // A mark per gap; a gap's key lists its accepted forms separated by "|".
  gap_match: (key, given) => {
    const gaps = parseList(given);
    const correct = key.filter((k, i) =>
      isAnswerCorrect(k.split('|'), gaps[i]),
    ).length;
    return { correct, total: key.length };
  },
  // A mark per word of the sentence the candidate typed, in any order.
  dictation_match: (key, given) => {
    const words = (s: string) =>
      normalise(s)
        .replace(/[^\p{L}\p{N}\s']/gu, '')
        .split(/\s+/)
        .filter(Boolean);
    const expected = words(key[0] ?? '');
    const typed = words(given ?? '');
    let correct = 0;
    for (const w of expected) {
      const at = typed.indexOf(w);
      if (at >= 0) {
        correct++;
        typed.splice(at, 1);
      }
    }
    return { correct, total: expected.length };
  },
};

/**
 * How a task is marked, resolved from its definition. Throws for a task the
 * exam does not declare: silently marking an unknown task would hide a gap.
 */
export function evaluatorFor(exam: ExamKey, taskKey: string) {
  const task = getTask(exam, taskKey);
  if (!task) throw new Error(`${exam} has no task "${taskKey}" to evaluate`);
  const kind = EVALUATOR_KIND[task.evaluator];
  return kind === 'deterministic'
    ? {
        key: task.evaluator,
        kind,
        mark: DETERMINISTIC_EVALUATORS[task.evaluator as DeterministicKey],
      }
    : { key: task.evaluator, kind, mark: null };
}

// ---------------------------------------------------------------------------
// Building results
// ---------------------------------------------------------------------------

type Identity = {
  exam: ExamKey;
  examVersion: string;
  taskType: string;
  skill: Skill;
};

/** A marked objective attempt as an `AssessmentResult`. */
export function objectiveAssessment(
  id: Identity & { correct: number; total: number; score: number | null },
): AssessmentResult {
  return {
    exam: id.exam,
    examVersion: id.examVersion,
    taskType: id.taskType,
    score: id.score,
    dimensions: { correct: id.correct, total: id.total },
    measuredSkills: measuredSkillsFor(id.exam, id.taskType, id.skill),
    strengths: [],
    weaknesses: [],
    feedback: [],
  };
}

/** A model-graded attempt as an `AssessmentResult`: criteria become dimensions. */
export function modelAssessment(
  id: Identity & {
    score: number;
    criteria: readonly { name: string; band: number }[];
    feedback: readonly FeedbackItem[];
    strengths: readonly string[];
    weaknesses: readonly string[];
  },
): AssessmentResult {
  return {
    exam: id.exam,
    examVersion: id.examVersion,
    taskType: id.taskType,
    score: id.score,
    dimensions: Object.fromEntries(id.criteria.map((c) => [c.name, c.band])),
    measuredSkills: measuredSkillsFor(id.exam, id.taskType, id.skill),
    strengths: [...id.strengths],
    weaknesses: [...id.weaknesses],
    feedback: id.feedback.map(({ quote, kind, comment }) => ({
      quote,
      kind,
      comment,
    })),
  };
}
