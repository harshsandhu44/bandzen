'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { examSkills, getExam, isOnScale } from '@bandzen/exams/registry';
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
): Promise<string | null> {
  const userId = await requireUserId();

  // Scoped to this user, so a bound id from anywhere else resolves to nothing.
  const [sitting, report] = await Promise.all([
    getExamTaskSitting(userId, mockAttemptId),
    getExamScoreReport(userId, mockAttemptId),
  ]);
  if (!sitting || !report)
    return 'There is no finished estimate to pair it with.';

  const exam = getExam(sitting.mock.examKey);
  if (!exam) return 'Unknown exam.';

  // Refuse anything the exam could not actually have reported. Skills are
  // optional; the overall is not.
  const onScale = (raw: FormDataEntryValue | null) => {
    const text = String(raw ?? '').trim();
    if (!text) return null;
    const n = Number(text);
    return Number.isFinite(n) && isOnScale(exam, n) ? n : undefined;
  };
  const score = onScale(formData.get('score'));
  if (score == null)
    return 'Enter your overall score as it appears on the report.';
  const skills: Record<string, number | null> = {};
  for (const skill of examSkills(exam)) {
    const value = onScale(formData.get(skill));
    if (value === undefined) return `Check your ${skill} score.`;
    skills[skill] = value;
  }
  const source =
    formData.get('source') === 'official_practice'
      ? 'official_practice'
      : 'official';

  const takenOnRaw = String(formData.get('takenOn') ?? '').trim();
  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw) ? takenOnRaw : null;

  const saved = await recordOfficialScore({
    userId,
    examKey: sitting.mock.examKey,
    examVersion: sitting.mock.examVersion,
    score,
    ...skills,
    source,
    takenOn,
    mockAttemptId,
    estimatedScore: report.overall,
    scoringVersion: report.scoringVersion,
  });
  if (!saved) return 'You have already recorded a score for this mock.';
  revalidatePath('/mock', 'layout');
  return null;
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
