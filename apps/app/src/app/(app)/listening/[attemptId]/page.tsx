import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getAttempt, getListeningTest } from '@/lib/db/queries';
import { ListeningTest } from './listening-test';

export const metadata = { title: 'Listening test' };

export default async function ListeningAttemptPage({
  params,
}: PageProps<'/listening/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  // Scoped by userId, so a stranger's attempt id is simply a 404.
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status === 'complete') redirect(`/listening/${attemptId}/review`);

  const data = await getListeningTest(userId, attemptId);
  if (!data) notFound();

  return (
    <ListeningTest
      attemptId={attempt.id}
      track={data.track}
      questions={data.questions}
      saved={data.saved}
    />
  );
}
