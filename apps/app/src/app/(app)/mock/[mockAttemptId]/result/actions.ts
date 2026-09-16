'use server';

import { revalidatePath } from 'next/cache';
import { getExam, isOnScale } from '@bandzen/exams/registry';
import { PTE_SCORING_VERSION, pteScoreReport } from '@bandzen/exams/scoring';
import { requireUserId } from '@/lib/auth';
import {
  getExamTaskSitting,
  getProfile,
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
 * Stored with the sitting it follows and with Bandzen's estimate for that
 * sitting as it stands right now. The estimate is frozen rather than
 * recomputed later because it is assembled from stored assessments on every
 * page load: a change to the scoring arithmetic, or a re-grade, would move it
 * afterwards, and a pair that moves with the code it is meant to calibrate
 * measures nothing. `scoring_version` says which arithmetic produced it.
 */
export async function saveOfficialScore(
  mockAttemptId: string,
  formData: FormData,
) {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const exam = getExam(profile?.examKey ?? 'ielts');
  if (!exam) return;

  const score = Number(formData.get('score'));
  // Refuse anything the exam could not actually have reported.
  if (!Number.isFinite(score) || !isOnScale(exam, score)) return;

  const takenOnRaw = String(formData.get('takenOn') ?? '').trim();
  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw) ? takenOnRaw : null;

  // Scoped to this user, so a bound id from anywhere else resolves to nothing
  // and the score is simply stored without a sitting rather than attached to
  // someone else's.
  const sitting = await getExamTaskSitting(userId, mockAttemptId);
  const estimate =
    sitting?.mock.examKey === 'pte_academic'
      ? pteScoreReport(
          sitting.sections.map((s) => s.assessment).filter((a) => a != null),
        )
      : null;

  await recordOfficialScore({
    userId,
    examKey: exam.key,
    examVersion: exam.version,
    score,
    takenOn,
    mockAttemptId: sitting ? mockAttemptId : null,
    estimatedScore: estimate?.overall ?? null,
    scoringVersion: estimate ? PTE_SCORING_VERSION : null,
  });
  revalidatePath('/mock', 'layout');
}
