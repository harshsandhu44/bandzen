/**
 * Speech <-> text for listening content: ElevenLabs for text-to-speech,
 * OpenAI Whisper for the other direction.
 *
 * Two callers: `apps/app/scripts/synthesize-listening-audio.mts` (offline) and
 * `apps/admin`'s listening CMS, which fills in whichever of transcript/audio a
 * human didn't supply. Not `server-only` — the offline script imports it, same
 * call `apps/app/src/lib/ai/structured.ts` makes.
 */
import OpenAI, { toFile } from 'openai';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/** Rachel, one of ElevenLabs' premade voices — the single-voice default. */
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

/** OpenAI's stable transcription model. Cheap ($0.006/min) and accurate enough. */
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? 'whisper-1';

/** One ElevenLabs request tops out around here; a real track is well under. */
const MAX_TTS_CHARS = 10_000;

/**
 * Synthesizes a spoken transcript to an MP3. A conversation transcript with
 * "Name:" speaker labels is read by the one voice, labels included — the same
 * v1 tradeoff the offline pipeline makes.
 */
export async function synthesizeSpeech(transcript: string): Promise<Buffer> {
  const text = transcript.trim();
  if (!text)
    throw new Error('Nothing to synthesize — the transcript is empty.');
  if (text.length > MAX_TTS_CHARS) {
    throw new Error(
      `Transcript is ${text.length} characters; the ${MAX_TTS_CHARS} limit for one synthesis request would be exceeded.`,
    );
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': requireEnv('ELEVENLABS_API_KEY'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Transcribes an audio file to text. The result is a first draft of an answer
 * key — a human must read it before the track is published, since `evidence`
 * matching and grading both compare against it verbatim.
 */
export async function transcribeAudio(
  audio: ArrayBuffer | Uint8Array,
  filename = 'audio.mp3',
): Promise<string> {
  const client = new OpenAI({ apiKey: requireEnv('OPENAI_API_KEY') });
  const file = await toFile(
    audio instanceof Uint8Array ? audio : new Uint8Array(audio),
    filename,
  );
  const result = await client.audio.transcriptions.create({
    file,
    model: TRANSCRIBE_MODEL,
  });
  return result.text.trim();
}
