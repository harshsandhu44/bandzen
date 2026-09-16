'use server';

import { revalidatePath } from 'next/cache';
import { getExam, isOnScale } from '@bandzen/exams/registry';
import { requireUserId } from '@/lib/auth';
import { getProfile, recordOfficialScore } from '@/lib/db/queries';

/**
 * Record the score a candidate actually got, when they come back and tell us.
 *
 * This is the only number in the system that is not an estimate, and the point
 * of asking for it is to find out how far the estimates are off. It is stored
 * in its own table; nothing averages it with a Bandzen score or shows it as
 * one.
 */
export async function saveOfficialScore(formData: FormData) {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const exam = getExam(profile?.examKey ?? 'ielts');
  if (!exam) return;

  const score = Number(formData.get('score'));
  // Refuse anything the exam could not actually have reported.
  if (!Number.isFinite(score) || !isOnScale(exam, score)) return;

  const takenOnRaw = String(formData.get('takenOn') ?? '').trim();
  const takenOn = /^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw) ? takenOnRaw : null;

  await recordOfficialScore({
    userId,
    examKey: exam.key,
    examVersion: exam.version,
    score,
    takenOn,
  });
  revalidatePath('/mock', 'layout');
}
