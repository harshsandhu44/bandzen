import {
  EXAMS,
  EXAM_KEYS,
  getExam,
  type ExamKey,
} from '@bandzen/exams/registry';
import type { ListFilter } from '@/components/content-list';

/** The exam select every content list carries. */
export const EXAM_FILTER: ListFilter = {
  key: 'exam',
  label: 'All exams',
  options: EXAMS.map((e) => ({ value: e.key, label: e.name })),
};

/** A task-type select over one exam's sections (all of them when omitted). */
export function taskFilter(
  exam: ExamKey,
  sections?: readonly string[],
): ListFilter {
  const definition = getExam(exam)!;
  return {
    key: 'task',
    label: 'All task types',
    options: definition.tasks
      .filter((t) => !sections || sections.includes(t.section))
      .map((t) => ({ value: t.key, label: t.label })),
  };
}

/** Every exam's task types, for a list that spans exams. */
export const ALL_TASKS_FILTER: ListFilter = {
  key: 'task',
  label: 'All task types',
  options: EXAMS.flatMap((e) =>
    e.tasks.map((t) => ({ value: t.key, label: `${e.name} · ${t.label}` })),
  ),
};

/** A `?exam=` value, if it names an exam. */
export function asExam(value: string | undefined): ExamKey | undefined {
  return (EXAM_KEYS as readonly string[]).includes(value ?? '')
    ? (value as ExamKey)
    : undefined;
}
