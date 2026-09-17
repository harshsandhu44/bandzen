'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getExam, isOnScale } from '@bandzen/exams/registry';
import { gradeExamTask } from '@/lib/ai/grade-exam-task';
import { requireUserId } from '@/lib/auth';
import {
  claimFailedForGrading,
  getAttempt,
  getExamScoreReport,
  getExamTaskSitting,
  recordOfficialScore,
} from '@/lib/db/queries';

/**
 * Record the score a candidate actually got, when they come back and tell us.
 *
 * This is the only number in the system that is not an estimate, and the point
 * of asking for it is to find out how far the estimates are off. It is stored
 * in its own table; nothing averages it with a Bandzen score or shows it as
 * one.
 *
 * Everything about it comes from the sitting, never from whichever exam is
 * active now: a PTE result reopened after switching to IELTS must still be
 * validated on PTE's scale and filed as PTE. The estimate it is paired with is
 * the sitting's stored report, copied as written — and without a finished
 * report there is nothing honest to pair it with, so it is refused.
 */
export async function saveOfficialScore(
  mockAttemptId: string,
  formData: FormData,
) {
  const userId = await requireUserId();

  // Scoped to this user, so a bound id from anywhere else resolves to nothing.
  const [sitting, report] = await Promise.all([
    getExamTaskSitting(userId, mockAttemptId),
    getExamScoreReport(userId, mockAttemptId),
  ]);
  if (!sitting || !report) return;

  const exam = getExam(sitting.mock.examKey);
  if (!exam) return;

  const score = Number(formData.get('score'));
  // Refuse anything the exam could not actually have reported.
  if (!Number.isFinite(score) || !isOnScale(exam, score)) return;

  const takenOnRaw = String(formData.get('takenOn') ?? '').trim();
  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw) ? takenOnRaw : null;

  await recordOfficialScore({
    userId,
    examKey: sitting.mock.examKey,
    examVersion: sitting.mock.examVersion,
    score,
    takenOn,
    mockAttemptId,
    estimatedScore: report.overall,
    scoringVersion: report.scoringVersion,
  });
  revalidatePath('/mock', 'layout');
}

/**
 * Pick a failed task under a sitting back up. Claimed atomically, so a double
 * click grades it once; the grader finalises the report when it succeeds.
 */
export async function retrySittingGrading(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) return;

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId) return;

  if (await claimFailedForGrading(userId, attemptId)) {
    after(() => gradeExamTask(attemptId));
  }
  revalidatePath(`/mock/${attempt.mockAttemptId}/result`);
}
