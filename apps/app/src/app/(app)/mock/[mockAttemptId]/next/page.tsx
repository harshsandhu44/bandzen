import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, Panel } from '@/components/app/primitives';
import { requireUserId } from '@/lib/auth';
import { getMockAttempt, getMockSiblings } from '@/lib/db/queries';
import type { Skill } from '@/lib/db/schema';
import { mockPosition, type MockChild } from '@/lib/mock';
import { enterMockSection } from '../../actions';

export const metadata = { title: 'Mock test' };

const SECTION_COPY: Record<Skill, { title: string; body: string }> = {
  listening: {
    title: 'Listening starts now',
    body: '4 recordings, each played once. No pausing, no rewinding — write your answers as you listen.',
  },
  reading: {
    title: 'Reading starts now',
    body: '3 passages, 60 minutes on the clock. Move between them freely — the hour is for all three together.',
  },
  writing: {
    title: 'Writing starts now',
    body: 'Task 1 and Task 2, 60 minutes combined. Switch between them whenever you like; nothing forces a 20/40 split.',
  },
  speaking: {
    title: 'Speaking starts now',
    body: 'Three parts, recorded from your microphone. Part 2 gives you a minute to prepare before you speak.',
  },
};

/**
 * The one interstitial for every section transition. Deliberately does not
 * trust its own `?section=` — `enterMockSection` recomputes the real
 * position and lands the candidate there regardless of what this URL says.
 */
export default async function MockNextPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/next'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();

  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) notFound();
  if (mock.submittedAt) redirect(`/mock/${mockAttemptId}/result`);

  const siblings: MockChild[] = await getMockSiblings(userId, mockAttemptId);
  const position = mockPosition(siblings);
  if (!position) redirect(`/mock/${mockAttemptId}/result`);

  const copy = SECTION_COPY[position];

  return (
    <div className="mx-auto max-w-xl space-y-6 py-12">
      <PageHeader
        eyebrow="Mock test"
        title={copy.title}
        description={copy.body}
      />
      <Panel title="Ready?">
        <p className="text-sm text-muted-foreground text-pretty">
          Once you continue, the section&apos;s clock starts. Sections you have
          already submitted are done for this sitting — there is no going back
          to them.
        </p>
        <form action={enterMockSection} className="mt-4">
          <input type="hidden" name="mockAttemptId" value={mockAttemptId} />
          <Button type="submit">
            Continue <ArrowRight />
          </Button>
        </form>
      </Panel>
    </div>
  );
}
