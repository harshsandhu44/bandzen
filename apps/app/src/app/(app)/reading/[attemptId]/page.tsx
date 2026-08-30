import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getAttempt, getReadingTest } from '@/lib/db/queries';
import { minutesFor } from '../timing';
import { ReadingTest } from './reading-test';

export const metadata = { title: 'Reading test' };

export default async function ReadingAttemptPage({
  params,
}: PageProps<'/reading/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  // Scoped by userId, so a stranger's attempt id is simply a 404.
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status === 'complete') redirect(`/reading/${attemptId}/review`);

  const data = await getReadingTest(userId, attemptId);
  if (!data) notFound();

  return (
    <ReadingTest
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      minutes={minutesFor(data.questions.length)}
      passage={data.passage}
      headings={data.passage.headings ?? null}
      questions={data.questions}
      saved={data.saved}
    />
  );
}
