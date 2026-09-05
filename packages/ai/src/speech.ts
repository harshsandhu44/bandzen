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

/**
 * A small pool of ElevenLabs premade voices for multi-speaker conversations,
 * grouped by the gender the generator tags each character with. Distinct
 * speakers of the same gender in one track cycle through their pool rather
 * than reusing one voice.
 */
const VOICE_POOL: Record<'male' | 'female', string[]> = {
  female: ['21m00Tcm4TlvDq8ikWAM', 'AZnzlk1XvdvUeBnXmlld'], // Rachel, Domi
  male: ['TxGEqnHWrfWFTfGW9XjX', 'VR6AewLTigWG4xSOukaG'], // Josh, Arnold
};

/** OpenAI's stable transcription model. Cheap ($0.006/min) and accurate enough. */
const TRANSCRIBE_MODEL = process.env.TRANSCRIBE_MODEL ?? 'whisper-1';

/** One ElevenLabs request tops out around here; a real track is well under. */
const MAX_TTS_CHARS = 10_000;

/**
 * Cheaper, lower-latency model than eleven_multilingual_v2 (1 credit per 2
 * chars instead of 1:1) — ElevenLabs' own recommended default over both
 * multilingual and turbo, with no meaningful quality loss for the narration
 * and dialogue this app synthesizes.
 */
const MODEL_ID = 'eleven_flash_v2_5';

async function synthesizeWithVoice(
  text: string,
  voiceId: string,
): Promise<Buffer> {
  if (text.length > MAX_TTS_CHARS) {
    throw new Error(
      `Text is ${text.length} characters; the ${MAX_TTS_CHARS} limit for one synthesis request would be exceeded.`,
    );
  }
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': requireEnv('ELEVENLABS_API_KEY'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, model_id: MODEL_ID }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** Synthesizes a spoken transcript to an MP3, read by the one default voice. */
export async function synthesizeSpeech(transcript: string): Promise<Buffer> {
  const text = transcript.trim();
  if (!text)
    throw new Error('Nothing to synthesize — the transcript is empty.');
  return synthesizeWithVoice(text, VOICE_ID);
}

/** One speaker's line, parsed out of a "Name: text" transcript. */
export type Turn = { speaker: string | null; text: string };

/**
 * Splits a transcript into per-speaker turns. Each "Name: ..." line starts a
 * new turn; a monologue with no such labels comes back as a single turn with
 * speaker: null. Blank lines between turns are just separators.
 */
export function parseTurns(transcript: string): Turn[] {
  const lines = transcript.trim().split('\n');
  const turns: Turn[] = [];
  const speakerLine = /^([A-Za-z][A-Za-z '-]{0,30}):\s*(.*)$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = speakerLine.exec(line);
    if (match) {
      turns.push({ speaker: match[1]!, text: match[2]! });
    } else if (turns.length) {
      // Continuation of the previous speaker's turn (also how a label sitting
      // alone on its own line picks up the text that follows it).
      const prev = turns[turns.length - 1]!;
      prev.text = prev.text ? `${prev.text} ${line}` : line;
    } else {
      turns.push({ speaker: null, text: line });
    }
  }
  return turns;
}

/**
 * Synthesizes a transcript to one MP3. A dialogue ("Name: ..." lines) gets a
 * distinct voice per speaker — cycling within the gender pool `speakers`
 * assigns them, so two speakers of the same gender still sound different —
 * synthesized turn by turn and concatenated; the spoken audio never reads the
 * name labels aloud. A monologue (or a transcript with only one speaker)
 * falls back to `synthesizeSpeech`, one request, no concatenation.
 */
export async function synthesizeConversation(
  transcript: string,
  speakers?: Record<string, 'male' | 'female'>,
): Promise<Buffer> {
  const turns = parseTurns(transcript);
  const distinctSpeakers = [...new Set(turns.map((t) => t.speaker))].filter(
    (s): s is string => s !== null,
  );

  if (distinctSpeakers.length < 2) return synthesizeSpeech(transcript);

  // ponytail: cycles within its gender's pool once it runs out of distinct
  // voices there; a >2-female or >2-male track reuses a voice rather than
  // failing — add more premade voices to VOICE_POOL if that gets audible.
  const nextIndex: Record<'male' | 'female', number> = { male: 0, female: 0 };
  const voiceBySpeaker = new Map<string, string>();
  for (const speaker of distinctSpeakers) {
    const gender = speakers?.[speaker] ?? 'female';
    const pool = VOICE_POOL[gender];
    voiceBySpeaker.set(speaker, pool[nextIndex[gender] % pool.length]!);
    nextIndex[gender] += 1;
  }

  // Sequential, not Promise.all: ElevenLabs' Starter plan caps concurrent
  // requests at 6, and a track can have more turns than that.
  const clips: Buffer[] = [];
  for (const turn of turns) {
    clips.push(
      await synthesizeWithVoice(
        turn.text,
        turn.speaker ? voiceBySpeaker.get(turn.speaker)! : VOICE_ID,
      ),
    );
  }
  return Buffer.concat(clips);
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
 * listening runner's waveform display, and reads its duration off the same
 * decode — the mock test's Listening section sums these to know how long its
 * 4 tracks run without a candidate-visible clock. Pure WASM decode — no
 * ffmpeg, which Vercel doesn't ship (the same reason Speaking encodes WAV
 * client-side).
 */
export async function computePeaks(
  mp3: Buffer,
): Promise<{ peaks: number[]; durationSeconds: number }> {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const { channelData, samplesDecoded, sampleRate } = decoder.decode(
      new Uint8Array(mp3),
    );
    const samples = channelData[0];
    return {
      peaks: samples?.length ? peaksFromSamples(samples) : [],
      durationSeconds: sampleRate ? samplesDecoded / sampleRate : 0,
    };
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
