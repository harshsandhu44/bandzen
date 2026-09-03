import { NextResponse } from 'next/server';
import { getTrackGenerationState, updateTrack } from '@bandzen/db/queries';
import { synthesizeSpeech, transcribeAudio } from '@bandzen/ai/speech';
import { uploadObject } from '@bandzen/storage/r2';
import { requireAdminOrTeacher } from '@/lib/auth';

// TTS of a full transcript, or Whisper of a few minutes of audio, comfortably
// under two minutes. The default 15s function budget would not cover it.
export const maxDuration = 120;

/** A generation older than this is treated as dead, and a new one may start. */
const STALE_MS = 3 * 60 * 1000;

/**
 * Fills in whichever of transcript / audio a track is missing:
 * transcript present, audio absent -> ElevenLabs TTS -> R2.
 * audio present, transcript absent -> fetch the MP3 -> Whisper.
 *
 * The edit page POSTs here on mount when a field is missing, and again when
 * the user hits "Try again" after a failure. `generation_started_at` keeps a
 * page refresh from starting a second run over the top of a live one.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await requireAdminOrTeacher();
  const { id } = await params;

  const track = await getTrackGenerationState(id);
  if (!track) {
    return NextResponse.json({ status: 'not-found' }, { status: 404 });
  }

  const hasAudio = !!track.audioUrl;
  const hasTranscript = !!track.transcript;
  if (hasAudio && hasTranscript) {
    return NextResponse.json({ status: 'done' });
  }

  const running =
    track.generationStartedAt != null &&
    Date.now() - track.generationStartedAt.getTime() < STALE_MS;
  if (running) {
    return NextResponse.json({ status: 'running' });
  }

  await updateTrack(
    id,
    { generationStartedAt: new Date(), generationError: null },
    userId,
  );

  try {
    if (hasTranscript && !hasAudio) {
      const mp3 = await synthesizeSpeech(track.transcript!);
      const audioUrl = await uploadObject({
        key: `listening/${crypto.randomUUID()}.mp3`,
        body: mp3,
        contentType: 'audio/mpeg',
      });
      await updateTrack(id, { audioUrl, generationStartedAt: null }, userId);
      return NextResponse.json({ status: 'done', generated: 'audio' });
    }

    if (hasAudio && !hasTranscript) {
      const res = await fetch(track.audioUrl!);
      if (!res.ok) {
        throw new Error(`Could not fetch the audio file (${res.status}).`);
      }
      const transcript = await transcribeAudio(
        await res.arrayBuffer(),
        `${track.slug}.mp3`,
      );
      await updateTrack(id, { transcript, generationStartedAt: null }, userId);
      return NextResponse.json({ status: 'done', generated: 'transcript' });
    }

    // Neither field is set — there is nothing to derive one from.
    await updateTrack(
      id,
      {
        generationStartedAt: null,
        generationError:
          'Add a transcript or an audio file so the other can be generated.',
      },
      userId,
    );
    return NextResponse.json({ status: 'error' });
  } catch (e) {
    await updateTrack(
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
