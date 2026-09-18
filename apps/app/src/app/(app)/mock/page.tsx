import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { ProTag, QuotaMeter } from '@/components/billing/pro';
import { SubmitButton } from '@/components/app/submit-button';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import {
  getProfile,
  isPro,
  latestOpenMock,
  listPublishedExamTasks,
  mockAllowance,
} from '@/lib/db/queries';
import { getExam } from '@bandzen/exams/registry';
import { composeSitting } from '@/lib/exam-sitting';
import { startMock } from './actions';

export const metadata = { title: 'Mock test' };

/**
 * The full mock: one continuous sitting in the exam's own order, with its own
 * lockstep. IELTS runs Listening → Reading → Writing → Speaking; PTE opens
 * with Speaking & Writing and closes with Listening, so every word on this
 * page comes from the exam definition rather than from a constant. Pro-only,
 * capped at one a week — see `entitlements.ts#canStartMock` for why the cap
 * applies even to Pro.
 *
 * An exam composed from task items says how long the sitting it would start
 * actually is. PTE's real format is 65-85 items and the question bank cannot
 * fill that yet, and a page that called the result a full mock anyway would be
 * selling something it does not have.
 */
export default async function MockPage() {
  const userId = await requireUserId();
  const [pro, cap, open, profile] = await Promise.all([
    isPro(userId),
    mockAllowance(userId),
    latestOpenMock(userId),
    getProfile(userId),
  ]);

  const exam = getExam(profile?.examKey ?? 'ielts');
  const parts = exam?.sections.map((s) => s.label).join(' · ') ?? '';
  const scoreNoun = exam?.scoreScale.label.toLowerCase() ?? 'score';

  // What starting a mock right now would actually compose. IELTS picks from its
  // own content tables and is always full length.
  const sitting =
    exam && exam.key !== 'ielts'
      ? composeSitting(exam, await listPublishedExamTasks(exam.key))
      : null;
  const composed = sitting?.taskIds.length ?? 0;
  const demanded = sitting?.demanded ?? 0;
  const short = composed < demanded;

  if (!pro) {
    await capture(userId, 'pro_feature_locked', { surface: 'mock' });
  } else if (!open && !cap.allowed) {
    await capture(userId, 'quota_exhausted', { surface: 'mock' });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Timed test"
        title={short ? 'Short mock test' : 'Full mock test'}
        description={
          short
            ? `${parts}, back to back, in the real test's order — but ${composed} questions where the real ${exam?.name} runs ${demanded}. One overall ${scoreNoun} at the end, estimated from what you sat.`
            : `${parts}, back to back, exactly as the real test runs. One overall ${scoreNoun} at the end.`
        }
      />

      <Panel headingId="mock-heading" title="Mock test">
        <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
          {[
            ['Sections', parts],
            ['Duration', exam?.duration ?? ''],
            ['Rules', 'No going back once a section is submitted'],
            ['Status', open ? 'In progress' : 'Not started'],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-3">
              <Eyebrow as="dt">{label!}</Eyebrow>
              <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-3 px-5 py-4">
          {!pro ? (
            <>
              <Button variant="outline" disabled>
                Start mock test <ProTag className="ml-2" />
              </Button>
              <p className="max-w-prose text-sm text-muted-foreground text-pretty">
                The full mock is Pro — it commits real grading on your essays
                and your speaking recording, the same as sitting the real thing.
              </p>
            </>
          ) : (
            <>
              <form action={startMock}>
                <SubmitButton disabled={!open && !cap.allowed}>
                  {open ? 'Resume mock test' : 'Start mock test'}
                  <ArrowRight />
                </SubmitButton>
              </form>
              {!open ? (
                <QuotaMeter
                  id="mock-quota"
                  allowance={cap}
                  noun="mock tests"
                  source="mock_wall"
                  timezone={profile?.timezone}
                />
              ) : (
                <p className="max-w-prose text-sm text-muted-foreground text-pretty">
                  Picking up where you left off — sections you have already
                  submitted stay submitted.
                </p>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
