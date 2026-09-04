import { notFound } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@bandzen/ui/components/accordion';
import { requireUserId } from '@/lib/auth';
import {
  essayAllowance,
  getProfile,
  getReport,
  markedEssayCount,
} from '@/lib/db/queries';
import { UpgradePrompt, resetLabel } from '@/components/billing/pro';
import { GradedReport } from '@/components/exam/graded-report';
import { retryGrading } from '../../actions';

export const metadata = { title: 'Writing report' };

export default async function WritingReportPage({
  params,
}: PageProps<'/writing/[attemptId]/report'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getReport(userId, attemptId);
  if (!data) notFound();

  const { attempt, report, essay } = data;
  const done = attempt.status === 'complete';
  if (done && !report) notFound();

  // The two upgrade "moments": the first marked essay (demonstrated value, no
  // scarcity) and the one that empties the weekly allowance (value plus a real
  // date). The same block under every report is wallpaper by the third view.
  const [quota, marked, profile] = done
    ? await Promise.all([
        essayAllowance(userId),
        markedEssayCount(userId),
        getProfile(userId),
      ])
    : [null, 0, null];

  const prompt =
    !quota || quota.unlimited
      ? null
      : !quota.allowed
        ? {
            eyebrow: 'That was your last mark this week',
            title: 'Keep going without waiting',
            meta: quota.resetsAt
              ? `Next free mark ${resetLabel(quota.resetsAt, profile?.timezone)}`
              : undefined,
          }
        : marked <= 1
          ? {
              eyebrow: 'Your first marked essay',
              title: 'Every essay, marked like this',
              meta: `${quota.remaining} of ${quota.limit} marks left this week`,
            }
          : null;

  return (
    <GradedReport
      moduleLabel="Writing"
      attemptId={attemptId}
      status={attempt.status}
      retryAction={retryGrading}
      grading={{
        title: 'Reading your response',
        note: 'This takes up to a minute. You can close this tab — the report will be here when you come back.',
      }}
      report={report}
      annotationScope="In your response"
    >
      {prompt ? (
        <UpgradePrompt
          eyebrow={prompt.eyebrow}
          title={prompt.title}
          meta={prompt.meta}
          source="report_moment"
          cta="See Pro"
        />
      ) : null}

      {essay ? (
        <Accordion className="border-t border-border pt-4">
          <AccordionItem value="essay">
            <AccordionTrigger className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
              Your response · {essay.wordCount} words
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm leading-7 whitespace-pre-wrap">
                {essay.body}
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : null}
    </GradedReport>
  );
}
