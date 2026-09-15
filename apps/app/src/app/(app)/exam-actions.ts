'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { EXAM_KEYS } from '@bandzen/exams/registry';
import { requireUserId } from '@/lib/auth';
import { setActiveExam } from '@/lib/db/queries';

/**
 * Switch the active exam from the top bar. Only between exams the candidate
 * has already set up; history under every exam is left exactly as it is.
 */
export async function switchExam(examKey: string) {
  const userId = await requireUserId();
  const parsed = z.enum(EXAM_KEYS).safeParse(examKey);
  if (!parsed.success) return;
  if (await setActiveExam(userId, parsed.data)) revalidatePath('/', 'layout');
}
