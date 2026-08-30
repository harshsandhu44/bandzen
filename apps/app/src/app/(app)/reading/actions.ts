'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  findChildAttempt,
  findInProgress,
  getAttempt,
  pickTask2Prompt,
  saveAnswer,
  submitReading,
} from '@/lib/db/queries';

export async function startReadingAttempt(formData: FormData) {
  const passageId = String(formData.get('passageId') ?? '');
  if (!passageId) throw new Error('Missing passage');

  const userId = await requireUserId();

  // Resume rather than stack up abandoned attempts on the same passage.
  const existing = await findInProgress(userId, { passageId });
  if (existing) redirect(`/reading/${existing.id}`);

  const attempt = await createAttempt({ userId, module: 'reading', passageId });
  redirect(`/reading/${attempt.id}`);
}

/**
 * Autosave. Under Supabase the browser wrote to Postgres directly; with Neon
 * there are no client-side credentials, so every save is a server action. It
 * is debounced client-side, so this runs on the order of once a second at
 * worst — not per keystroke.
 */
export async function saveReadingAnswer(input: {
  attemptId: string;
  questionId: string;
  value: string | null;
  flagged: boolean;
}) {
  const userId = await requireUserId();
  await saveAnswer(
    userId,
    input.attemptId,
    input.questionId,
    input.value,
    input.flagged,
  );
}

export async function submitReadingAttempt(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const graded = await submitReading(userId, attemptId);
  if (!graded) throw new Error('Attempt not found');

  // A diagnostic is two engines chained, not a new surface: reading hands
  // straight over to a Task 2 essay rather than stopping at review.
  if (graded.kind === 'diagnostic') {
    const existing = await findChildAttempt(userId, attemptId);
    if (existing) redirect(`/writing/${existing.id}`);

    const prompt = await pickTask2Prompt();
    if (prompt) {
      const essayAttempt = await createAttempt({
        userId,
        module: 'writing',
        kind: 'diagnostic',
        promptId: prompt.id,
        parentId: attemptId,
      });
      redirect(`/writing/${essayAttempt.id}`);
    }
    // No Task 2 prompt seeded: fall through to review rather than stranding
    // the candidate on a dead end.
  }

  redirect(`/reading/${attemptId}/review`);
}

export async function attemptStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
