import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { ProTag, QuotaMeter } from '@/components/billing/pro';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import {
  getProfile,
  isPro,
  latestOpenMock,
  mockAllowance,
} from '@/lib/db/queries';
import { MOCK_DURATION_LABEL } from '@/lib/timing';
import { startMock } from './actions';

export const metadata = { title: 'Mock test' };

/**
 * The full four-skill mock: one continuous sitting, Listening → Reading →
 * Writing → Speaking, real IELTS order and real IELTS lockstep. Pro-only,
 * capped at one a week — see `entitlements.ts#canStartMock` for why the cap
 * applies even to Pro.
 */
export default async function MockPage() {
  const userId = await requireUserId();
  const [pro, cap, open, profile] = await Promise.all([
    isPro(userId),
    mockAllowance(userId),
    latestOpenMock(userId),
    getProfile(userId),
  ]);

  if (!pro) {
    await capture(userId, 'pro_feature_locked', { surface: 'mock' });
  } else if (!open && !cap.allowed) {
    await capture(userId, 'quota_exhausted', { surface: 'mock' });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Timed test"
        title="Full mock test"
        description="Listening, Reading, Writing and Speaking, back to back, exactly as the real test runs. One overall band at the end."
      />

      <Panel headingId="mock-heading" title="Mock test">
        <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
          {[
            ['Sections', 'Listening · Reading · Writing · Speaking'],
            ['Duration', MOCK_DURATION_LABEL],
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
                <Button type="submit" disabled={!open && !cap.allowed}>
                  {open ? 'Resume mock test' : 'Start mock test'}
                  <ArrowRight />
                </Button>
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
