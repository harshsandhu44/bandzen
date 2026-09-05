import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  getAttempt,
  getMockAttempt,
  getMockSectionAttempts,
  getMockWritingTest,
  getWritingTest,
} from '@/lib/db/queries';
import { assertMockSection } from '@/lib/mock-guard';
import { MOCK_SECTION_MINUTES, taskRules } from '@/lib/timing';
import { MockWritingTest } from './mock-writing-test';
import { WritingTest } from './writing-test';

export const metadata = { title: 'Writing task' };

export default async function WritingAttemptPage({
  params,
}: PageProps<'/writing/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  if (attempt.kind === 'mock' && attempt.mockAttemptId) {
    const mock = await getMockAttempt(userId, attempt.mockAttemptId);
    if (!mock) notFound();

    // Task 1's attempt is the canonical URL — a bookmark or stale link
    // pointing at Task 2's own attempt id lands here instead.
    const siblings = await getMockSectionAttempts(
      userId,
      attempt.mockAttemptId,
      'writing',
    );
    const task1Row = siblings.find(
      (r) => r.promptId === mock.writingTask1PromptId,
    );
    if (!task1Row) notFound();
    if (task1Row.id !== attemptId) redirect(`/writing/${task1Row.id}`);

    await assertMockSection(userId, task1Row);

    const data = await getMockWritingTest(userId, attempt.mockAttemptId);
    if (!data) notFound();

    return (
      <MockWritingTest
        startedAt={data.startedAt.toISOString()}
        minutes={MOCK_SECTION_MINUTES.writing}
        task1={data.task1}
        task2={data.task2}
      />
    );
  }

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
      chartData={data.prompt.chartData}
      initialBody={data.body}
      autoSubmit={attempt.kind !== 'practice'}
    />
  );
}
