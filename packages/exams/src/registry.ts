import { DET } from './det.ts';
import { IELTS } from './ielts.ts';
import { PTE_ACADEMIC } from './pte-academic.ts';
import { TOEFL_IBT } from './toefl-ibt.ts';
import {
  EVALUATORS,
  RENDERERS,
  SKILLS,
  type ExamDefinition,
  type ExamKey,
  type ScoreScale,
  type TaskDefinition,
} from './types.ts';

export * from './types.ts';

export const EXAMS: readonly ExamDefinition[] = [
  IELTS,
  PTE_ACADEMIC,
  TOEFL_IBT,
  DET,
];

/** The format version new rows are stamped with, per exam. */
export const CURRENT_EXAM_VERSION = Object.fromEntries(
  EXAMS.map((e) => [e.key, e.version]),
) as Record<ExamKey, string>;

export function getExam(key: string): ExamDefinition | null {
  return EXAMS.find((e) => e.key === key) ?? null;
}

/** An exam's score scale; IELTS's for a user who has not picked an exam yet. */
export function scoreScaleFor(key: string | null | undefined): ScoreScale {
  return (getExam(key ?? 'ielts') ?? IELTS).scoreScale;
}

export function getTask(exam: string, key: string): TaskDefinition | null {
  return getExam(exam)?.tasks.find((t) => t.key === key) ?? null;
}

/**
 * The task an IELTS Reading or Listening question row belongs to. Throws on a
 * kind the definition does not cover: that is a definition gap, and a runner
 * silently falling back to a text box would hide it.
 */
export function ieltsQuestionTask(
  section: 'reading' | 'listening',
  kind: string,
): TaskDefinition {
  const found = getTask('ielts', `${section}_${kind}`);
  if (!found) throw new Error(`IELTS has no ${section} task for "${kind}"`);
  return found;
}

/**
 * How long the candidate has, in seconds: the task's own windows when it is
 * task-timed, otherwise its section's clock. Null for an untimed or adaptive
 * section.
 */
export function timeLimitSeconds(
  exam: ExamDefinition,
  task: TaskDefinition,
): number | null {
  if (task.timing.scope === 'task') {
    return task.timing.prepSeconds + task.timing.responseSeconds;
  }
  const minutes = exam.sections.find((s) => s.key === task.section)?.minutes;
  return minutes == null ? null : minutes * 60;
}

/** Everything wrong with a definition, as sentences. Empty means valid. */
export function validateDefinition(exam: ExamDefinition): string[] {
  const problems: string[] = [];
  const { min, max, step } = exam.scoreScale;
  if (!(min < max) || !(step > 0) || !Number.isInteger((max - min) / step)) {
    problems.push(`score scale ${min}–${max} step ${step} is not a scale`);
  }

  const sectionKeys = new Set<string>();
  for (const s of exam.sections) {
    if (sectionKeys.has(s.key))
      problems.push(`section "${s.key}" is declared twice`);
    sectionKeys.add(s.key);
    if (s.minutes != null && !(s.minutes > 0)) {
      problems.push(`section "${s.key}" has a non-positive length`);
    }
  }

  const taskKeys = new Set<string>();
  for (const t of exam.tasks) {
    if (taskKeys.has(t.key)) problems.push(`task "${t.key}" is declared twice`);
    taskKeys.add(t.key);
    if (!sectionKeys.has(t.section)) {
      problems.push(`task "${t.key}" is in unknown section "${t.section}"`);
    }
    if (!(RENDERERS as readonly string[]).includes(t.renderer)) {
      problems.push(`task "${t.key}" has unknown renderer "${t.renderer}"`);
    }
    if (!(EVALUATORS as readonly string[]).includes(t.evaluator)) {
      problems.push(`task "${t.key}" has unknown evaluator "${t.evaluator}"`);
    }
    if (
      !t.measuredSkills.length ||
      t.measuredSkills.some((s) => !(SKILLS as readonly string[]).includes(s))
    ) {
      problems.push(`task "${t.key}" measures no known skill`);
    }
    if (
      t.timing.scope === 'task' &&
      (t.timing.prepSeconds < 0 || !(t.timing.responseSeconds > 0))
    ) {
      problems.push(`task "${t.key}" has an impossible time window`);
    }
  }

  for (const s of exam.sections) {
    if (!exam.tasks.some((t) => t.section === s.key)) {
      problems.push(`section "${s.key}" has no tasks`);
    }
  }
  return problems;
}
