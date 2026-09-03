import { NextResponse } from 'next/server';
import {
  getSpeakingTestGenerationState,
  updateSpeakingPrompt,
  updateSpeakingTest,
} from '@bandzen/db/queries';
import { synthesizeSpeech } from '@bandzen/ai/speech';
import { uploadObject } from '@bandzen/storage/r2';
import { requireAdminOrTeacher } from '@/lib/auth';

// One ElevenLabs call per prompt without audio, ~10 prompts a test. The
// default function budget would not cover a full pass.
export const maxDuration = 120;

/** A generation older than this is treated as dead, and a new one may start. */
const STALE_MS = 3 * 60 * 1000;

/**
 * Synthesizes the examiner voice for every prompt in a test that is missing
 * it, in one pass. The edit page POSTs here on mount whenever any prompt has
 * no audio, and again on "Try again" after a failure. `generation_started_at`
 * on the test row keeps a refresh from starting a second run over a live one.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await requireAdminOrTeacher();
  const { id } = await params;

  const test = await getSpeakingTestGenerationState(id);
  if (!test) {
    return NextResponse.json({ status: 'not-found' }, { status: 404 });
  }

  const pending = test.prompts.filter((p) => !p.audioUrl);
  if (pending.length === 0) {
    return NextResponse.json({ status: 'done' });
  }

  const running =
    test.generationStartedAt != null &&
    Date.now() - test.generationStartedAt.getTime() < STALE_MS;
  if (running) {
    return NextResponse.json({ status: 'running' });
  }

  await updateSpeakingTest(
    id,
    { generationStartedAt: new Date(), generationError: null },
    userId,
  );

  try {
    for (const prompt of pending) {
      const mp3 = await synthesizeSpeech(prompt.text);
      const audioUrl = await uploadObject({
        key: `speaking/${crypto.randomUUID()}.mp3`,
        body: mp3,
        contentType: 'audio/mpeg',
      });
      await updateSpeakingPrompt(prompt.id, { audioUrl });
    }
    await updateSpeakingTest(id, { generationStartedAt: null }, userId);
    return NextResponse.json({ status: 'done', generated: pending.length });
  } catch (e) {
    await updateSpeakingTest(
      id,
      {
        generationStartedAt: null,
        generationError: e instanceof Error ? e.message : String(e),
      },
      userId,
    );
    return NextResponse.json({ status: 'error' });
  }
}
