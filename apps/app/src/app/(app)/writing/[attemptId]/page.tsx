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
import { sittingSectionMinutes, taskRules } from '@/lib/timing';
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

  if (attempt.mockAttemptId) {
    const mock = await getMockAttempt(userId, attempt.mockAttemptId);
    if (!mock) notFound();

    const siblings = await getMockSectionAttempts(
      userId,
      attempt.mockAttemptId,
      'writing',
    );

    // The canonical URL: Task 1's row for a mock, the single Task 2 row for a
    // diagnostic. A stale link pointing at Task 2's own id lands on Task 1.
    const canonicalRow =
      mock.writingTask1PromptId != null
        ? siblings.find((r) => r.promptId === mock.writingTask1PromptId)
        : siblings[0];
    if (!canonicalRow) notFound();
    if (canonicalRow.id !== attemptId) redirect(`/writing/${canonicalRow.id}`);

    await assertMockSection(userId, canonicalRow);

    const data = await getMockWritingTest(userId, attempt.mockAttemptId);
    if (!data) notFound();

    return (
      <MockWritingTest
        startedAt={data.startedAt.toISOString()}
        minutes={sittingSectionMinutes(data.kind, 'writing')}
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
