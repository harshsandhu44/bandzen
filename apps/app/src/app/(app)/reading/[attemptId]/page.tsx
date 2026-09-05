import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  getAttempt,
  getMockReadingTest,
  getReadingTest,
} from '@/lib/db/queries';
import { assertMockSection } from '@/lib/mock-guard';
import { MOCK_SECTION_MINUTES, minutesFor } from '@/lib/timing';
import { MockReadingTest } from './mock-reading-test';
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

  if (attempt.kind === 'mock') {
    await assertMockSection(userId, attempt);

    const data = await getMockReadingTest(userId, attemptId);
    if (!data) notFound();

    return (
      <MockReadingTest
        attemptId={attempt.id}
        startedAt={attempt.startedAt.toISOString()}
        minutes={MOCK_SECTION_MINUTES.reading}
        passages={data.passages}
        questions={data.questions}
        headingsByQuestion={Object.fromEntries(data.headingsByQuestion)}
        saved={data.saved}
      />
    );
  }

  if (attempt.status === 'complete') redirect(`/reading/${attemptId}/review`);

  const data = await getReadingTest(userId, attemptId);
  if (!data) notFound();

  return (
    <ReadingTest
      attemptId={attempt.id}
      startedAt={attempt.startedAt.toISOString()}
      minutes={minutesFor(data.questions.length)}
      autoSubmit={attempt.kind !== 'practice'}
      passage={data.passage}
      headings={data.passage.headings ?? null}
      questions={data.questions}
      saved={data.saved}
    />
  );
}
