import type { TaskContent } from '@bandzen/exams/content';
import {
  timeLimitSeconds,
  type ExamDefinition,
  type TaskDefinition,
} from '@bandzen/exams/registry';
import {
  itemFromContent,
  type StimulusData,
  type TaskItem,
} from './task-content.ts';

/** A saved `exam_task_responses` row joined to its item, as the loader returns it. */
export type SavedTaskRow = {
  taskId: string;
  content: TaskContent;
  value: string | null;
  audioUrl: string | null;
};

export type RunnerItem = {
  taskId: string;
  stimulus: StimulusData;
  item: TaskItem;
  value: string;
};

/**
 * Saved rows as the runner takes them.
 *
 * A recording's answer is the uploaded URL and everything else's is the stored
 * value, so restoring reads whichever the task wrote. An untouched item comes
 * back as an empty string rather than undefined: these feed controlled inputs,
 * and a controlled input handed undefined becomes uncontrolled mid-attempt.
 */
export function runnerItems(
  task: TaskDefinition,
  rows: readonly SavedTaskRow[],
): RunnerItem[] {
  return rows.map((row) => ({
    taskId: row.taskId,
    value: row.value ?? row.audioUrl ?? '',
    ...itemFromContent(task, row.content),
  }));
}

/**
 * The clock for a session of `count` items, in minutes.
 *
 * A task-timed window belongs to each item, so several of them add up. A
 * section-timed task has no honest practice clock — its real one covers a whole
 * exam section, not the handful of items practised here — so it runs untimed
 * until the mock composer gives it the real thing.
 */
export function sessionMinutes(
  exam: ExamDefinition,
  task: TaskDefinition,
  count: number,
): number | null {
  if (task.timing.scope !== 'task') return null;
  const perItem = timeLimitSeconds(exam, task);
  return perItem == null ? null : (perItem * count) / 60;
}
