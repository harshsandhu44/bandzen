import {
  fullLengthItems,
  getExam,
  getTask,
  type ExamDefinition,
} from '@bandzen/exams/registry';
import type { Skill } from './db/schema';

/**
 * Composing a sitting out of published task items, and working out which of
 * them belong to the section a candidate has reached.
 *
 * Pure — no database, no framework — for the same reason as `mock.ts`: the
 * ordering rules are the part worth testing, and they should be testable
 * without a fixture.
 */

export type PublishedTask = {
  id: string;
  taskType: string;
  section: string;
};

/**
 * The items a sitting will run, in the exam's own order, and how many the real
 * format asks for.
 *
 * Task types come in the order the exam declares them, which is the order the
 * real test runs them in, and each contributes as many items as the exam's
 * definition says that type carries — `items.min`, the shortest a real sitting
 * can be. A type with too little published contributes what there is.
 *
 * `demanded` comes back alongside so the caller can say how long the sitting
 * actually is rather than claim a full-length test. Nothing here decides that:
 * the numbers are a fact about the sitting, and the label is a fact about the
 * numbers.
 */
export function composeSitting(
  exam: ExamDefinition,
  published: readonly PublishedTask[],
): { taskIds: string[]; demanded: number } {
  const byType = new Map<string, PublishedTask[]>();
  for (const task of published) {
    byType.set(task.taskType, [...(byType.get(task.taskType) ?? []), task]);
  }
  return {
    taskIds: exam.tasks.flatMap((definition) =>
      (byType.get(definition.key) ?? [])
        .slice(0, definition.items?.min ?? 1)
        .map((t) => t.id),
    ),
    demanded: fullLengthItems(exam),
  };
}

/**
 * The skill a task type is sat under.
 *
 * Deliberately NOT the first skill the task measures: PTE's tasks are
 * integrated, so Repeat Sentence measures listening and speaking, and filing
 * it under listening would sit a spoken task in the Listening part. What
 * decides it is the section the task belongs to — and where that section
 * covers two skills, as PTE's Speaking & Writing does, the task's own response
 * says which half of it this is. Spoken answers are Speaking; written ones are
 * Writing.
 */
export function skillForTaskType(
  examKey: string,
  taskType: string,
): Skill | null {
  const exam = getExam(examKey);
  const task = getTask(examKey, taskType);
  if (!exam || !task) return null;

  const section = exam.sections.find((s) => s.key === task.section);
  if (!section?.skills.length) return null;
  if (section.skills.length === 1) return section.skills[0]!;

  const half = task.response === 'audio' ? 'speaking' : 'writing';
  return section.skills.includes(half) ? half : section.skills[0]!;
}

/** The sitting's items that belong to one skill, in the sitting's own order. */
export function tasksForSkill(
  examKey: string,
  published: readonly PublishedTask[],
  orderedIds: readonly string[],
  skill: Skill,
): string[] {
  const byId = new Map(published.map((t) => [t.id, t]));
  return orderedIds.filter((id) => {
    const task = byId.get(id);
    return task ? skillForTaskType(examKey, task.taskType) === skill : false;
  });
}

/** The skills a composed sitting actually covers, in the exam's section order. */
export function skillsInSitting(
  examKey: string,
  published: readonly PublishedTask[],
  orderedIds: readonly string[],
): Skill[] {
  const exam = getExam(examKey);
  if (!exam) return [];
  const covered = new Set(
    orderedIds
      .map((id) => published.find((t) => t.id === id)?.taskType)
      .filter((t): t is string => Boolean(t))
      .map((t) => skillForTaskType(examKey, t))
      .filter((s): s is Skill => Boolean(s)),
  );
  // `examSkills` order, filtered to what this sitting has content for.
  return exam.sections
    .flatMap((s) => s.skills)
    .filter((skill, i, all) => all.indexOf(skill) === i)
    .filter((skill) => covered.has(skill));
}
