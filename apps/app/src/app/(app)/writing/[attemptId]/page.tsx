import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getAttempt, getWritingTest } from '@/lib/db/queries';
import { taskRules } from '../timing';
import { WritingTest } from './writing-test';

export const metadata = { title: 'Writing task' };

export default async function WritingAttemptPage({
  params,
}: PageProps<'/writing/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status !== 'in_progress')
    redirect(`/writing/${attemptId}/report`);

  const data = await getWritingTest(userId, attemptId);
  if (!data) notFound();

  const { minutes, minWords } = taskRules(data.prompt.task);

  return (
    <WritingTest
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      minutes={minutes}
      minWords={minWords}
      task={data.prompt.task}
      promptText={data.prompt.promptText}
      initialBody={data.body}
    />
  );
}
