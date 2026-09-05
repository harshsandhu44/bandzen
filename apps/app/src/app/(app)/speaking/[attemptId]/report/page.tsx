import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import { getSpeakingReport } from '@/lib/db/queries';
import { GradedReport } from '@/components/exam/graded-report';
import { retrySpeakingGrading } from '../../actions';

export const metadata = { title: 'Speaking report' };

export default async function SpeakingReportPage({
  params,
}: PageProps<'/speaking/[attemptId]/report'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getSpeakingReport(userId, attemptId);
  if (!data) notFound();

  const { attempt, report } = data;
  if (attempt.status === 'complete' && !report) notFound();

  // ponytail: the "Your answers" playback + transcript section is hidden while
  // browser-recorded WAVs are coming back silent — a mute <audio> and an empty
  // transcript read as broken. `getSpeakingReport` still returns `responses`;
  // restore the <section> here once the recording pipeline is fixed.

  return (
    <GradedReport
      moduleLabel="Speaking"
      attemptId={attemptId}
      status={attempt.status}
      retryAction={retrySpeakingGrading}
      grading={{
        title: 'Listening to your answers',
        note: 'This takes a minute or two — the examiner listens to every answer. You can close this tab; the report will be here when you come back.',
      }}
      report={report}
      annotationScope="In your answers"
    >
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <Button nativeButton={false} render={<Link href="/speaking" />}>
          Practise another test
        </Button>
        <Link
          href="/progress"
          className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase underline underline-offset-4 hover:text-foreground"
        >
          All reviews
        </Link>
      </div>
    </GradedReport>
  );
}
