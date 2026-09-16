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
  type SectionDefinition,
  type Skill,
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
  // The longest the section can run. A candidate cut short by the shorter
  // version of a test would be cut short by us too, which is the worse error.
  return minutes == null ? null : minutes.max * 60;
}

/** "30 min", or "23-30 min" where the board publishes a range. */
export function sectionMinutesLabel(section: SectionDefinition): string | null {
  const m = section.minutes;
  if (!m) return null;
  return m.min === m.max ? `${m.max} min` : `${m.min}\u2013${m.max} min`;
}

/**
 * The shortest sitting the real format can be, in items.
 *
 * The minimum rather than the mean, because it is the number a sitting has to
 * reach before calling itself full-length. Zero for an exam that declares no
 * counts, which is every exam but PTE.
 */
export function fullLengthItems(exam: ExamDefinition): number {
  return exam.tasks.reduce((total, t) => total + (t.items?.min ?? 0), 0);
}

/** The sign-up target choices, low to high, as numbers. */
export function targetChoices(exam: ExamDefinition): number[] {
  const { min, max, step } = exam.targetRange;
  const out: number[] = [];
  for (let n = 0; min + n * step <= max + 1e-9; n++) out.push(min + n * step);
  return out;
}

/**
 * Whether a score is one this exam can report: inside the scale and on its
 * step. What a submitted target or self-estimate is checked against.
 */
export function isOnScale(exam: ExamDefinition, value: number): boolean {
  const { min, max, step } = exam.scoreScale;
  const steps = (value - min) / step;
  return (
    value >= min && value <= max && Math.abs(steps - Math.round(steps)) < 1e-9
  );
}

/** The skills an exam measures, in the order its sections first name them. */
export function examSkills(exam: ExamDefinition): Skill[] {
  return [...new Set(exam.sections.flatMap((s) => s.skills))];
}

/** "IELTS Academic", "PTE Academic": the exam as the candidate names it. */
export function examLabel(key: string, variant?: string | null): string {
  const exam = getExam(key);
  if (!exam) return key;
  const v = exam.variants.find((x) => x.key === variant);
  return v ? `${exam.name} ${v.label}` : exam.name;
}

/** Everything wrong with a definition, as sentences. Empty means valid. */
export function validateDefinition(exam: ExamDefinition): string[] {
  const problems: string[] = [];
  const { min, max, step } = exam.scoreScale;
  if (!(min < max) || !(step > 0) || !Number.isInteger((max - min) / step)) {
    problems.push(`score scale ${min}–${max} step ${step} is not a scale`);
  }

  const range = exam.targetRange;
  if (
    !(range.min <= range.max) ||
    !isOnScale(exam, range.min) ||
    !isOnScale(exam, range.max) ||
    !Number.isInteger((range.max - range.min) / range.step)
  ) {
    problems.push(
      `target range ${range.min}–${range.max} does not fit the scale`,
    );
  }

  const sectionKeys = new Set<string>();
  for (const s of exam.sections) {
    if (sectionKeys.has(s.key))
      problems.push(`section "${s.key}" is declared twice`);
    sectionKeys.add(s.key);
    if (
      s.minutes != null &&
      !(0 < s.minutes.min && s.minutes.min <= s.minutes.max)
    ) {
      problems.push(`section "${s.key}" has an impossible length`);
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
    if (t.items && !(0 < t.items.min && t.items.min <= t.items.max)) {
      problems.push(`task "${t.key}" has an impossible item count`);
    }
    if (t.audio) {
      if (!Number.isInteger(t.audio.plays) || t.audio.plays < 1) {
        problems.push(`task "${t.key}" allows no plays of its audio`);
      }
      if (t.stimulus !== 'audio' && t.stimulus !== 'mixed') {
        problems.push(`task "${t.key}" has an audio policy but shows no audio`);
      }
      if ((t.audio.startDelaySeconds ?? 0) < 0) {
        problems.push(`task "${t.key}" starts its audio before it begins`);
      }
    }
  }

  for (const s of exam.sections) {
    if (!exam.tasks.some((t) => t.section === s.key)) {
      problems.push(`section "${s.key}" has no tasks`);
    }
  }
  return problems;
}
