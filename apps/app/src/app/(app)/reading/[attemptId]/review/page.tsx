import { notFound, redirect } from 'next/navigation';
import { ObjectiveReview } from '@/components/exam/objective-review';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  getAttempt,
  getReadingReview,
} from '@/lib/db/queries';

export const metadata = { title: 'Review' };

export default async function ReadingReviewPage({
  params,
}: PageProps<'/reading/[attemptId]/review'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status !== 'complete') redirect(`/reading/${attemptId}`);

  const [data, history] = await Promise.all([
    getReadingReview(userId, attemptId),
    accuracyByQuestionKind(userId, 'reading'),
  ]);
  if (!data) notFound();

  return (
    <ObjectiveReview
      module="reading"
      title={data.passage.title}
      band={attempt.band}
      rawScore={attempt.rawScore}
      total={attempt.total}
      rows={data.rows}
      history={history}
    />
  );
}
