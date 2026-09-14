import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import OpenAI from 'openai';
import { parseStructured } from '@bandzen/ai/structured';
import { speakingEvaluationSchema } from '@bandzen/ai/schemas';
import { synthesizeSpeech } from '@bandzen/ai/speech';
import { buildSpeakingMessages } from '../src/lib/ai/messages.ts';
import { sliceWav } from '../src/lib/wav.ts';

/**
 * Does a Speaking grader model actually hear our recordings, and up to what
 * length?
 *
 * `gpt-audio-mini` is shut down on 2027-01-20 and its only Chat Completions
 * replacement, `gpt-audio-1.5`, answered 9 of 12 replays in #70 with a polite
 * sentence — *"I don't have the candidate's spoken answers to assess"* — on
 * audio `gpt-audio-mini` graded fine. Failures tracked total audio duration
 * exactly, but n was 4 with one attempt per duration, and duration, clip count
 * and payload size all moved together. This separates them.
 *
 * Three arms, because each implies a different fix:
 *
 *   A  one clip, 10s -> 120s .................. where the cliff is at all
 *   B  60s total as 1 / 3 / 8 clips ........... per-clip vs per-request
 *   C  60s as wav_16000 / wav_8000 / mp3 ...... payload size vs duration
 *
 * Arm B decides whether chunking the interview is even on the table: production
 * already sends one `input_audio` part per prompt, so a per-clip limit is
 * survivable and a per-request one is not. Arm C is the one that could end the
 * issue outright — `wav_8000` is the same container and the same duration at
 * half the bytes, so if it passes where `wav_16000` fails, this is a size limit
 * and the fix is an encoder setting.
 *
 * Unlike `eval-grader.mts` there is no corpus and no stored band to compare
 * against: production has zero speaking attempts. Fixtures are synthesized, and
 * the verdict is whether the model produced a report at all, not how good it
 * was. That is why this is a separate script rather than a flag on that one.
 *
 * Read-only and database-free. Needs OPENAI_API_KEY and ELEVENLABS_API_KEY.
 *
 * Run:
 *   pnpm --filter @bandzen/app eval:speaking-audio -- \
 *     --models gpt-audio-mini,gpt-audio-1.5 --repeat 3
 *   pnpm --filter @bandzen/app eval:speaking-audio -- \
 *     --models gpt-audio-mini --arms AB --repeat 1      # the smoke run
 */

/** developers.openai.com/api/docs/pricing, fetched 2026-09-14. */
const PRICES_USD_PER_MTOK: Record<
  string,
  { in: number; audioIn: number; out: number }
> = {
  'gpt-audio-mini': { in: 0.6, audioIn: 10, out: 2.4 },
  'gpt-audio': { in: 2.5, audioIn: 40, out: 10 },
  'gpt-audio-1.5': { in: 2.5, audioIn: 32, out: 10 },
};

/**
 * The #70 signature. Only a reply matching this is evidence about the cliff —
 * anything else that fails to parse is the fixture misbehaving, not the model
 * going deaf, and the two must not be summed into one number.
 */
const DEAF =
  /don'?t (have|hear)|did not (receive|hear)|no audio|unable to (hear|listen)|provide .{0,30}(audio|spoken|recording)/i;

function arg(name: string, fallback?: string) {
  const at = process.argv.indexOf(`--${name}`);
  const value = at >= 0 ? process.argv[at + 1] : undefined;
  if (value === undefined) {
    if (fallback === undefined) throw new Error(`Missing --${name}`);
    return fallback;
  }
  return value;
}

const MODELS = arg('models')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const REPEAT = Number(arg('repeat', '3'));
const ARMS = arg('arms', 'ABC').toUpperCase();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Fixtures ---------------------------------------------------------------

/**
 * A plausible Band 6-7 Part 2 answer to a real cue card from
 * `content/speaking/an-outdoor-activity-you-enjoyed.json`. Long enough to slice
 * a 120s clip out of, which is the Part 2 recording cap.
 *
 * It has to be a *candidate answer*, not any speech: the failure being measured
 * is a model saying it received no answer to assess, and examiner audio would
 * draw that reply honestly.
 */
const ANSWER = `I'd like to talk about a hiking trip I did last spring, which was probably the most enjoyable outdoor activity I've done in years. The activity itself was a day hike up a ridge about two hours north of the city, in a national park that a colleague had been recommending to me for ages.
We went in early April, I think, when the weather had just started to turn. It wasn't warm exactly, but it was clear, and that matters a lot for this particular route because the whole point of it is the view from the top. If it's overcast you climb for four hours and see nothing but cloud.
I went with two friends from university. We've known each other for about eight years now, and one of them is a fairly serious hiker, so he planned the route and worked out the timings. The other one, honestly, had never done anything like it before, and I think he regretted agreeing to come at around the halfway point. He got there in the end though.
What made it enjoyable was a combination of things. The obvious one is the scenery. When you come over the last section of the ridge the valley opens up completely and you can see three or four lakes at once, and on a clear day you can apparently see the coast, although we couldn't quite make that out. We sat up there for nearly an hour eating sandwiches and nobody really said very much, which I think says something.
But the other part, and maybe the more important part, is that it was a full day with no phones and no work. I'd been going through quite a stressful period at my job at the time, working long hours, and the walk forced me to just switch off for eight hours straight. By the time we got back down to the car park I felt genuinely different, much calmer, in a way that a weekend at home never achieves.
I'd say the physical challenge added to it as well. It wasn't dangerous, but it was hard enough that finishing it felt like an achievement. There's a satisfaction in being tired for a good reason. Since then we've tried to do something similar every few months, though we haven't managed a route quite as good as that one yet.`;

/** The 60s script for arm C — one text, three containers. */
const SHORT_ANSWER = ANSWER.split('\n').slice(0, 3).join('\n');

const CACHE = join(tmpdir(), 'bandzen-speaking-fixtures');

/** Synthesize once, then reuse across runs. Fixtures cost ElevenLabs credits. */
async function fixture(text: string, format: string): Promise<Uint8Array> {
  mkdirSync(CACHE, { recursive: true });
  const key = createHash('sha256')
    .update(`${format}\n${text}`)
    .digest('hex')
    .slice(0, 16);
  const path = join(CACHE, `${key}.${format}`);
  if (existsSync(path)) return new Uint8Array(readFileSync(path));

  console.log(`  synthesizing ${format} (${text.length} chars)…`);
  const bytes = await synthesizeSpeech(text, format);
  writeFileSync(path, bytes);
  return new Uint8Array(bytes);
}

/** Seconds of a PCM WAV, read off its own header rather than assumed. */
function wavSeconds(wav: Uint8Array): number {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const id = (at: number) => String.fromCharCode(...wav.subarray(at, at + 4));
  let byteRate = 0;
  for (let at = 12; at + 8 <= wav.byteLength;) {
    const size = Math.min(
      view.getUint32(at + 4, true),
      wav.byteLength - at - 8,
    );
    if (id(at) === 'fmt ') byteRate = view.getUint32(at + 16, true);
    else if (id(at) === 'data') return size / byteRate;
    at += 8 + size + (size % 2);
  }
  throw new Error('No data chunk.');
}

// --- Conditions -------------------------------------------------------------

const catalogue = JSON.parse(
  readFileSync('content/speaking/an-outdoor-activity-you-enjoyed.json', 'utf8'),
) as { prompts: Array<{ idx: number; part: number; text: string }> };

/** Real examiner prompts, so the message under test is a real test's shape. */
const PROMPTS = catalogue.prompts.map((p) => ({
  promptId: `p${p.idx}`,
  part: p.part,
  text: p.text,
}));
/** The Part 2 cue card, which is what a single long clip answers. */
const CUE_CARD = PROMPTS.find((p) => p.part === 2) ?? PROMPTS[0]!;

type Condition = {
  arm: string;
  name: string;
  clips: Array<{ promptId: string; bytes: Uint8Array }>;
  prompts: typeof PROMPTS;
  format: 'wav' | 'mp3';
  seconds: number;
};

async function conditions(): Promise<Condition[]> {
  const out: Condition[] = [];
  const master = await fixture(ANSWER, 'wav_16000');
  const masterSeconds = wavSeconds(master);
  console.log(`  master: ${masterSeconds.toFixed(1)}s, ${master.length} bytes`);

  const one = (seconds: number, from = 0) => ({
    promptId: CUE_CARD.promptId,
    bytes: sliceWav(master, seconds, from),
  });

  if (ARMS.includes('A')) {
    for (const s of [10, 15, 20, 25, 30, 45, 60, 120]) {
      if (s > masterSeconds) {
        console.warn(`  skipping A/${s}s: master is only ${masterSeconds}s`);
        continue;
      }
      out.push({
        arm: 'A',
        name: `1x${s}s`,
        clips: [one(s)],
        prompts: [CUE_CARD],
        format: 'wav',
        seconds: s,
      });
    }
  }

  if (ARMS.includes('B')) {
    // 60s of audio every time; only how it is split changes. Slices are taken
    // from consecutive offsets so the model is not handed the same clip N
    // times, which it could reasonably remark on rather than grade.
    for (const n of [1, 3, 8]) {
      const each = 60 / n;
      const used = PROMPTS.slice(0, n);
      out.push({
        arm: 'B',
        name: `${n}x${each}s`,
        clips: used.map((p, i) => ({
          promptId: p.promptId,
          bytes: sliceWav(master, each, i * each),
        })),
        prompts: used,
        format: 'wav',
        seconds: 60,
      });
    }
  }

  if (ARMS.includes('C')) {
    // Same 60s script, three payload sizes. wav_8000 is the isolating one:
    // same container, same duration, half the bytes.
    for (const format of ['wav_16000', 'wav_8000', 'mp3_22050_32'] as const) {
      const bytes = await fixture(SHORT_ANSWER, format);
      const isWav = format.startsWith('wav');
      out.push({
        arm: 'C',
        name: format,
        clips: [{ promptId: CUE_CARD.promptId, bytes }],
        prompts: [CUE_CARD],
        format: isWav ? 'wav' : 'mp3',
        seconds: isWav ? wavSeconds(bytes) : (bytes.length * 8) / 32_000,
      });
    }
  }

  return out;
}

// --- The run ----------------------------------------------------------------

type Verdict = 'heard' | 'deaf' | 'other' | 'error';

async function runOne(model: string, c: Condition) {
  const messages = buildSpeakingMessages(c.prompts, c.clips);
  // `buildSpeakingMessages` hard-codes `format: 'wav'`, which is true of every
  // real recording. Arm C is the one place that is not, and rewriting the part
  // here keeps the rest of the message byte-for-byte what production sends.
  if (c.format === 'mp3') {
    for (const part of messages.at(-1)!.content as Array<{
      type: string;
      input_audio?: { format: string };
    }>) {
      if (part.type === 'input_audio' && part.input_audio) {
        part.input_audio.format = 'mp3';
      }
    }
  }

  const startedAt = Date.now();
  const response = await openai.chat.completions.create({
    model,
    modalities: ['text'],
    messages,
  });
  const latencyMs = Date.now() - startedAt;
  const reply = response.choices[0]?.message?.content ?? '';

  let verdict: Verdict;
  try {
    parseStructured(response, speakingEvaluationSchema);
    verdict = 'heard';
  } catch {
    verdict = DEAF.test(reply) ? 'deaf' : 'other';
  }
  return { verdict, reply, latencyMs, usage: response.usage };
}

const cases = await conditions();
const summary: Record<string, string | number>[] = [];
const unexplained: string[] = [];

for (const model of MODELS) {
  for (const c of cases) {
    const counts: Record<Verdict, number> = {
      heard: 0,
      deaf: 0,
      other: 0,
      error: 0,
    };
    const latencies: number[] = [];
    let promptTok = 0,
      audioTok = 0,
      outTok = 0,
      cachedTok = 0;

    for (let i = 0; i < REPEAT; i++) {
      try {
        const r = await runOne(model, c);
        counts[r.verdict]++;
        latencies.push(r.latencyMs);
        promptTok += r.usage?.prompt_tokens ?? 0;
        audioTok += r.usage?.prompt_tokens_details?.audio_tokens ?? 0;
        cachedTok += r.usage?.prompt_tokens_details?.cached_tokens ?? 0;
        outTok += r.usage?.completion_tokens ?? 0;
        if (r.verdict !== 'heard') {
          unexplained.push(
            `${model} ${c.arm}/${c.name} ${r.verdict}: ${r.reply.slice(0, 200).replace(/\s+/g, ' ')}`,
          );
        }
      } catch (e) {
        counts.error++;
        unexplained.push(
          `${model} ${c.arm}/${c.name} error: ${(e as Error).message.slice(0, 200)}`,
        );
      }
    }

    const p = PRICES_USD_PER_MTOK[model];
    const ran = REPEAT - counts.error;
    const cost = p
      ? (Math.max(0, promptTok - audioTok) * p.in +
          audioTok * p.audioIn +
          outTok * p.out) /
        1e6
      : NaN;

    summary.push({
      model,
      arm: c.arm,
      condition: c.name,
      clips: c.clips.length,
      audio: `${c.seconds.toFixed(1)}s`,
      KB: Math.round(c.clips.reduce((n, x) => n + x.bytes.length, 0) / 1024),
      heard: counts.heard,
      deaf: counts.deaf,
      other: counts.other,
      err: counts.error,
      'p50 ms': latencies.length
        ? [...latencies].sort((a, b) => a - b)[latencies.length >> 1]!
        : 0,
      'audio tok': ran ? Math.round(audioTok / ran) : 0,
      'tok/s': ran && c.seconds ? Math.round(audioTok / ran / c.seconds) : 0,
      'cache hit': promptTok
        ? `${Math.round((cachedTok / promptTok) * 100)}%`
        : '—',
      '$ / call': ran ? `$${(cost / ran).toFixed(4)}` : '—',
    });
    const last = summary.at(-1)!;
    console.log(
      `  ${model} ${c.arm}/${c.name}: ${counts.heard} heard, ${counts.deaf} deaf, ${counts.other} other, ${counts.error} err · ${last['$ / call']}`,
    );
  }
}

console.table(summary);

if (unexplained.length) {
  console.log('\nreplies that did not parse:');
  for (const line of unexplained) console.log(`  ${line}`);
}

console.log(
  '\nOnly `deaf` is evidence about the cliff. `other` means the model answered\n' +
    'something else entirely — re-read the replies above before concluding\n' +
    'anything from it, because a fixture the model finds ungradeable looks the\n' +
    'same in a count as a model that heard nothing.\n' +
    '\n' +
    'The incumbent (gpt-audio-mini) is the floor: it should be `heard` on every\n' +
    'row. Anything else means the fixture is the variable, not the model.\n' +
    '\n' +
    '`tok/s` is audio tokens per second of audio — multiply by a real test\n' +
    "(9-10 clips, up to ~10 minutes) and the model's audioIn rate for cost per\n" +
    'submission. These 10-120s clips are not that number.',
);
