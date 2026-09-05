import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, Panel } from '@/components/app/primitives';
import { getMockAttempt, getMockSiblings, isPro } from '@/lib/db/queries';
import type { Skill } from '@/lib/db/schema';
import { mockPosition, mockSectionUrl, type MockChild } from '@/lib/mock';
import { enterMockSection } from '@/app/(app)/mock/actions';

/**
 * The one interstitial shown before every section of a sitting — mock or
 * diagnostic. Deliberately does not trust its own `?section=`:
 * `enterMockSection` recomputes the real position and lands the candidate
 * there regardless of what the URL says.
 */

const SECTION_COPY: Record<
  'mock' | 'diagnostic',
  Record<Skill, { title: string; body: string }>
> = {
  mock: {
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
  },
  diagnostic: {
    listening: {
      title: 'Listening',
      body: '2 recordings, each played once. No pausing, no rewinding — answer as you listen.',
    },
    reading: {
      title: 'Reading',
      body: '2 passages, 40 minutes on the clock for both together.',
    },
    writing: {
      title: 'Writing',
      body: 'One Task 2 essay, 40 minutes. At least 250 words.',
    },
    speaking: {
      title: 'Speaking',
      body: 'Three parts, recorded from your microphone. Part 2 gives you a minute to prepare.',
    },
  },
};

export async function SittingInterstitial({
  userId,
  sittingId,
}: {
  userId: string;
  sittingId: string;
}) {
  const mock = await getMockAttempt(userId, sittingId);
  if (!mock) notFound();
  if (mock.submittedAt) {
    redirect(mockSectionUrl(sittingId, null, mock.kind));
  }

  const [siblings, includeSpeaking] = await Promise.all([
    getMockSiblings(userId, sittingId) as Promise<MockChild[]>,
    mock.kind === 'mock' ? Promise.resolve(true) : isPro(userId),
  ]);
  const position = mockPosition(siblings, { includeSpeaking });
  if (!position) redirect(mockSectionUrl(sittingId, null, mock.kind));

  const copy = SECTION_COPY[mock.kind][position];
  const eyebrow = mock.kind === 'diagnostic' ? 'Diagnostic' : 'Mock test';

  return (
    <div className="mx-auto max-w-xl space-y-6 py-12">
      <PageHeader eyebrow={eyebrow} title={copy.title} description={copy.body} />
      <Panel title="Ready?">
        <p className="text-sm text-muted-foreground text-pretty">
          Once you continue, the section&apos;s clock starts. Sections you have
          already submitted are done for this sitting — there is no going back
          to them.
        </p>
        <form action={enterMockSection} className="mt-4">
          <input type="hidden" name="mockAttemptId" value={sittingId} />
          <Button type="submit">
            Continue <ArrowRight />
          </Button>
        </form>
      </Panel>
    </div>
  );
}
