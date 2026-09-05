import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getAttempt, getSpeakingTest } from '@/lib/db/queries';
import { assertMockSection } from '@/lib/mock-guard';
import { SpeakingTest } from './speaking-test';

export const metadata = { title: 'Speaking test' };

export default async function SpeakingAttemptPage({
  params,
}: PageProps<'/speaking/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  // Scoped by userId, so a stranger's attempt id is simply a 404.
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  if (attempt.mockAttemptId) {
    await assertMockSection(userId, attempt);
  } else if (attempt.status !== 'in_progress') {
    redirect(`/speaking/${attemptId}/report`);
  }

  const data = await getSpeakingTest(userId, attemptId);
  if (!data) notFound();

  return (
    <SpeakingTest
      attemptId={attempt.id}
      title={data.test.title}
      prompts={data.prompts}
      saved={data.saved}
      mock={attempt.mockAttemptId != null}
    />
  );
}
