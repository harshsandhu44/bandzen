/**
 * Enforces sitting lockstep against a live attempt, and closes the sitting
 * when its last section submits. Split out of `mock.ts` because this needs
 * `db` (via `queries.ts`) and Next's `redirect` — see that file's own comment
 * for why those stay out of it.
 */

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { gradeExamTask } from './ai/grade-exam-task';
import {
  getExamTasksByIds,
  getMockAttempt,
  getMockSectionAttempts,
  getMockSiblings,
  submitExamTaskAttempt,
  submitMockAttempt,
} from './db/queries';
import {
  DEADLINE_GRACE_SECONDS,
  mockSectionDeadline,
  mockSectionMinutes,
} from './task-session';
import type { Attempt } from './db/schema';
import { mockPosition, mockSectionUrl } from './mock';

/**
 * Guards every sitting module `page.tsx`: renders only when `attempt` is the
 * sitting's live section. Anything else — this section was already
 * submitted, or a stale/bookmarked URL points at one out of order — redirects
 * to wherever the sitting actually is instead of rendering. Called after
 * `getAttempt`, guarded by `attempt.mockAttemptId != null`; a non-sitting
 * attempt has no `mockAttemptId` and this is a no-op for it.
 */
export async function assertMockSection(userId: string, attempt: Attempt) {
  if (!attempt.mockAttemptId) return;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) redirect('/');

  const siblings = await getMockSiblings(userId, attempt.mockAttemptId);
  const position = mockPosition(siblings, mock.examKey);

  if (attempt.status === 'in_progress' && position === attempt.module) return;

  redirect(mockSectionUrl(attempt.mockAttemptId, position, mock.kind));
}

/**
 * Called from every sitting section's submit action after grading. If no
 * section is left to reach, stamp `mock_attempts.submittedAt` (idempotent —
 * `submitMockAttempt` guards on `submittedAt IS NULL`) and send the candidate
 * to the result page; otherwise on to the next interstitial.
 *
 * Speaking is the last section of every sitting, so it is the natural
 * terminator — the sequencer returns `null` once its row is in.
 */
export async function finishSittingSection(
  userId: string,
  mockAttemptId: string,
): Promise<never> {
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) redirect('/');

  const siblings = await getMockSiblings(userId, mockAttemptId);
  const position = mockPosition(siblings, mock.examKey);

  if (!position) await submitMockAttempt(userId, mockAttemptId);

  redirect(mockSectionUrl(mockAttemptId, position, mock.kind));
}

/**
 * The shared clock of the mock section `attempt` belongs to, or null where its
 * task keeps its own window (or it is not a mock at all).
 *
 * Derived, not stored: a section's attempts are all created the moment the
 * candidate enters it, so the earliest of their start times IS the section's
 * start, and moving from one task type to the next cannot reset it.
 */
export async function mockSectionClock(userId: string, attempt: Attempt) {
  if (!attempt.mockAttemptId || !attempt.taskType) return null;
  const task = getTask(attempt.examKey, attempt.taskType);
  const exam = getExam(attempt.examKey);
  if (!task || !exam || task.timing.scope !== 'section') return null;

  const [mock, siblings] = await Promise.all([
    getMockAttempt(userId, attempt.mockAttemptId),
    getMockSectionAttempts(userId, attempt.mockAttemptId, attempt.module),
  ]);
  if (!mock?.taskIds) return null;

  const items = await getExamTasksByIds(mock.taskIds);
  const minutes = mockSectionMinutes(
    exam,
    task.section,
    items.filter((i) => i.section === task.section).length,
  );
  if (minutes == null) return null;

  const startedAt = new Date(
    Math.min(...siblings.map((s) => s.startedAt.getTime())),
  );
  return {
    startedAt,
    minutes,
    deadline: mockSectionDeadline(startedAt, minutes),
  };
}

/**
 * Close a mock section whose clock ran out: every section-timed attempt still
 * open in it is submitted as it stands, then the sitting moves on. Runs once
 * the grace for in-flight autosaves has passed, so an answer saved on the
 * last second still counts.
 */
export async function expireMockSectionIfDue(userId: string, attempt: Attempt) {
  const clock = await mockSectionClock(userId, attempt);
  if (!clock || !attempt.mockAttemptId) return;
  const closesAt = clock.deadline.getTime() + DEADLINE_GRACE_SECONDS * 1000;
  if (Date.now() < closesAt) return;

  const siblings = await getMockSectionAttempts(
    userId,
    attempt.mockAttemptId,
    attempt.module,
  );
  for (const sibling of siblings) {
    if (sibling.status !== 'in_progress' || !sibling.taskType) continue;
    if (
      getTask(sibling.examKey, sibling.taskType)?.timing.scope !== 'section'
    ) {
      continue;
    }
    const submitted = await submitExamTaskAttempt(userId, sibling.id);
    if (submitted?.needsModel) after(() => gradeExamTask(sibling.id));
  }
  await finishSittingSection(userId, attempt.mockAttemptId);
}
