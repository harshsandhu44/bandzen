/**
 * Speech <-> text for listening content: ElevenLabs for text-to-speech,
 * OpenAI Whisper for the other direction.
 *
 * Two callers: `apps/app/scripts/synthesize-listening-audio.mts` (offline) and
 * `apps/admin`'s listening CMS, which fills in whichever of transcript/audio a
 * human didn't supply. Not `server-only` — the offline script imports it, same
 * call `apps/app/src/lib/ai/structured.ts` makes.
 */
import { MPEGDecoder } from 'mpg123-decoder';
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

/** Bar count the runner's waveform renders — matches @bandzen/ui's Waveform default. */
const PEAK_COUNT = 120;

/**
 * Downsamples raw PCM samples to a fixed-length, 0-1 normalized amplitude
 * array — one RMS bucket per bar. Pulled out of `computePeaks` so the
 * bucketing/normalization logic is testable without a real MP3 decode.
 */
export function peaksFromSamples(
  samples: ArrayLike<number>,
  count = PEAK_COUNT,
): number[] {
  if (!samples.length) return [];

  const bucketSize = Math.max(1, Math.floor(samples.length / count));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < count; i++) {
    const start = i * bucketSize;
    let sum = 0;
    for (let j = start; j < start + bucketSize && j < samples.length; j++) {
      sum += samples[j] * samples[j];
    }
    const rms = Math.sqrt(sum / bucketSize);
    peaks.push(rms);
    if (rms > max) max = rms;
  }
  return max > 0 ? peaks.map((p) => Math.min(1, p / max)) : peaks;
}

/**
 * Downsamples an MP3 to a fixed-length amplitude array (0-1) for the
 * listening runner's waveform display. Pure WASM decode — no ffmpeg, which
 * Vercel doesn't ship (the same reason Speaking encodes WAV client-side).
 */
export async function computePeaks(mp3: Buffer): Promise<number[]> {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const { channelData } = decoder.decode(new Uint8Array(mp3));
    const samples = channelData[0];
    return samples?.length ? peaksFromSamples(samples) : [];
  } finally {
    decoder.free();
  }
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
