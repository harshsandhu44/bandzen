import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@bandzen/ui/components/accordion';
import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import { getSpeakingReport } from '@/lib/db/queries';
import { GradedReport } from '@/components/exam/graded-report';
import { retrySpeakingGrading } from '../../actions';

export const metadata = { title: 'Speaking report' };

const PART_LABEL: Record<number, string> = {
  1: 'Part 1',
  2: 'Part 2',
  3: 'Part 3',
};

export default async function SpeakingReportPage({
  params,
}: PageProps<'/speaking/[attemptId]/report'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getSpeakingReport(userId, attemptId);
  if (!data) notFound();

  const { attempt, report, responses } = data;
  if (attempt.status === 'complete' && !report) notFound();

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
      <section className="space-y-3" hidden={!responses?.length}>
        <h2 className="font-title text-title">Your answers</h2>
        <Accordion className="border-t border-border">
          {(responses ?? []).map((r) => (
            <AccordionItem key={r.promptId} value={r.promptId}>
              <AccordionTrigger>
                <span>
                  <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                    {PART_LABEL[r.part] ?? `Part ${r.part}`} ·{' '}
                  </span>
                  {r.promptText}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <audio controls src={r.audioUrl} className="w-full" />
                  {r.transcript ? (
                    <p className="text-sm leading-7 whitespace-pre-line text-muted-foreground">
                      {r.transcript}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Transcript unavailable for this answer.
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

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
