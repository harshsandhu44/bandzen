import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { ObjectiveReview } from '@/components/exam/objective-review';
import { capture } from '@/lib/analytics';
import { describePlayback } from '@/lib/playback';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  getAttempt,
  getListeningReview,
} from '@/lib/db/queries';

export const metadata = { title: 'Review' };

export default async function ListeningReviewPage({
  params,
}: PageProps<'/listening/[attemptId]/review'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();
  if (attempt.status !== 'complete') redirect(`/listening/${attemptId}`);

  after(() =>
    capture(userId, 'report_viewed', {
      module: 'listening',
      attempt_id: attemptId,
      overall_band: attempt.score,
    }),
  );

  const [data, history] = await Promise.all([
    getListeningReview(userId, attemptId),
    accuracyByQuestionKind(userId, 'listening'),
  ]);
  if (!data) notFound();

  return (
    <ObjectiveReview
      module="listening"
      title={data.track.title}
      band={attempt.score}
      rawScore={attempt.rawScore}
      total={attempt.total}
      rows={data.rows}
      history={history}
      transcript={data.track.transcript}
      conditions={describePlayback(
        attempt.playback,
        data.track.durationSeconds,
      )}
    />
  );
}
