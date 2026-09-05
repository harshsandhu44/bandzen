'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { checkAwards } from '@/lib/award-check';
import {
  createAttempt,
  findChildAttempt,
  findInProgress,
  getAttempt,
  pickTask2Prompt,
  saveAnswer,
  submitMockReading,
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

  // Which grading function applies is decided by kind, so it has to be known
  // before grading runs, not after — `submitReading` and `submitMockReading`
  // aggregate over a different set of questions (one passage vs. the mock's
  // three) and neither one is a superset of the other.
  const before = await getAttempt(userId, attemptId);
  if (!before) throw new Error('Attempt not found');

  const graded =
    before.kind === 'mock'
      ? await submitMockReading(userId, attemptId)
      : await submitReading(userId, attemptId);
  if (!graded) throw new Error('Attempt not found');

  // Before the redirects below, not after: `redirect` throws to unwind, so
  // nothing past one of them ever runs.
  await checkAwards(userId);

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

  if (graded.kind === 'mock' && graded.mockAttemptId) {
    redirect(`/mock/${graded.mockAttemptId}/next?section=writing`);
  }

  redirect(`/reading/${attemptId}/review`);
}

export async function attemptStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
