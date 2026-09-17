import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, Panel } from '@/components/app/primitives';
import { getMockAttempt, getMockSiblings } from '@/lib/db/queries';
import type { Skill } from '@/lib/db/schema';
import { mockPosition, mockSectionUrl, type MockChild } from '@/lib/mock';
import { enterMockSection } from '@/app/(app)/mock/actions';
import { MicGate } from '@/components/exam/mic-gate';

/**
 * The one interstitial shown before every section of a sitting — mock or
 * diagnostic. Deliberately does not trust its own `?section=`:
 * `enterMockSection` recomputes the real position and lands the candidate
 * there regardless of what the URL says.
 */

/**
 * What each exam's parts are called and what they ask of the candidate. PTE's
 * sittings open with Speaking and close with Listening, and its audio plays
 * once throughout, so IELTS's copy would be wrong in both order and substance.
 */
const PTE_COPY: Record<Skill, { title: string; body: string }> = {
  speaking: {
    title: 'Speaking starts now',
    body: 'Read Aloud, Repeat Sentence, Describe Image and Re-tell Lecture. One take each, with a short preparation window, and any recording plays once.',
  },
  writing: {
    title: 'Writing starts now',
    body: 'Summarize Written Text in a single sentence, then the essay. Each has its own clock and its own word range.',
  },
  reading: {
    title: 'Reading starts now',
    body: 'Blanks to fill, paragraphs to re-order and multiple choice. Some blanks offer a drop-down, others a bank of words with more words than gaps.',
  },
  listening: {
    title: 'Listening starts now',
    body: 'Every recording plays once. Some tasks ask you to write what you heard, others to mark the words that differ from it.',
  },
};

const SECTION_COPY: Record<
  'mock' | 'diagnostic',
  Record<Skill, { title: string; body: string }>
> = {
  mock: {
    listening: {
      title: 'Listening starts now',
      body: '4 recordings, each played once — no rewinding. Answer as you listen; when a recording ends, check your answers and move on when you are ready.',
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
      body: '2 recordings. Answer as you listen; when a recording ends, replay it if you need to, then move on when you are ready.',
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

  const siblings = (await getMockSiblings(userId, sittingId)) as MockChild[];
  const position = mockPosition(siblings, mock.examKey);
  if (!position) redirect(mockSectionUrl(sittingId, null, mock.kind));

  // A sitting built from exam tasks gets its own exam's copy; IELTS's would
  // describe passages and recordings this test does not contain.
  const copy = mock.taskIds
    ? PTE_COPY[position]
    : SECTION_COPY[mock.kind][position];
  const eyebrow = mock.kind === 'diagnostic' ? 'Diagnostic' : 'Mock test';

  return (
    <div className="mx-auto max-w-xl space-y-6 py-12">
      <PageHeader
        eyebrow={eyebrow}
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
          <input type="hidden" name="mockAttemptId" value={sittingId} />
          {/* A task sitting's spoken part records by itself, so it opens only
              once the microphone is known to work. */}
          {mock.taskIds && position === 'speaking' ? (
            <MicGate />
          ) : (
            <Button type="submit">
              Continue <ArrowRight />
            </Button>
          )}
        </form>
      </Panel>
    </div>
  );
}
