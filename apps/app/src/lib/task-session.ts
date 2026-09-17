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
  // A one-shot recording enforces its own preparation and response windows,
  // and it starts them when the candidate starts — so a page countdown on top
  // of it auto-submits the task on its own schedule. For Repeat Sentence, a
  // fifteen-second window, that fires before anyone can begin speaking.
  if (task.renderer === 'recording' || task.renderer === 'conversation') {
    return null;
  }
  if (task.timing.scope !== 'task') return null;
  const perItem = timeLimitSeconds(exam, task);
  return perItem == null ? null : (perItem * count) / 60;
}

// ---------------------------------------------------------------------------
// Mock sittings
//
// A mock runs under the real format's rules: one continuous clock per section,
// items taken in order with no way back, and each stimulus used once. These
// are the rules; the runner and the server actions enforce them.
// ---------------------------------------------------------------------------

/** How long past a deadline an autosave already in flight is still accepted. */
export const DEADLINE_GRACE_SECONDS = 5;

/**
 * Where a mock attempt resumes: the first item not yet moved past. Every item
 * done means the last one, which is where the candidate submits from.
 */
export function mockResumeIndex(
  rows: readonly { completedAt: Date | string | null }[],
): number {
  const next = rows.findIndex((r) => r.completedAt == null);
  return next === -1 ? Math.max(0, rows.length - 1) : next;
}

/**
 * A mock item whose stimulus has already begun and which has no recorded
 * answer: the candidate reloaded or left mid-task. The real test gives no
 * second go, so neither does this — it stays unanswered.
 */
export function isSpentRecording(row: {
  stimulusStartedAt: Date | string | null;
  audioUrl: string | null;
}): boolean {
  return row.stimulusStartedAt != null && !row.audioUrl;
}

/**
 * One section's shared clock in a mock, in minutes: the longest the section
 * runs, scaled to how much of it this sitting actually contains, rounded up.
 *
 * Pearson's minutes cover a full-length section, and a short mock that sits a
 * third of the items should not get the whole of it — nor be rushed through
 * three times as fast. `null` when the section has no published length.
 */
export function mockSectionMinutes(
  exam: ExamDefinition,
  sectionKey: string,
  itemsSat: number,
): number | null {
  const section = exam.sections.find((s) => s.key === sectionKey);
  if (!section?.minutes) return null;
  const full = exam.tasks
    .filter((t) => t.section === sectionKey)
    .reduce((n, t) => n + (t.items?.min ?? 0), 0);
  if (!full) return section.minutes.max;
  return Math.ceil(section.minutes.max * Math.min(1, itemsSat / full));
}

/** The section's deadline: when it was entered, plus its clock. */
export function mockSectionDeadline(
  sectionStartedAt: Date,
  minutes: number,
): Date {
  return new Date(sectionStartedAt.getTime() + minutes * 60_000);
}

/** Whether a write arriving `now` still counts: before the deadline, or in the grace after it. */
export function acceptsWrite(now: Date, deadline: Date | null): boolean {
  return (
    deadline == null ||
    now.getTime() <= deadline.getTime() + DEADLINE_GRACE_SECONDS * 1000
  );
}
