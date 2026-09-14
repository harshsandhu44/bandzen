import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { neon } from '@neondatabase/serverless';
import OpenAI from 'openai';
import { parseStructured, strictJsonSchema } from '@bandzen/ai/structured';
import {
  speakingEvaluationSchema,
  writingEvaluationSchema,
} from '@bandzen/ai/schemas';
import {
  buildSpeakingMessages,
  buildWritingMessages,
} from '../src/lib/ai/messages.ts';
import {
  speakingCoverageCeiling,
  writingLengthCeiling,
} from '../src/lib/grading.ts';

/**
 * Read-only. Answers one question: is a candidate model good enough to replace
 * the one grading real submissions?
 *
 * It replays attempts that have already been graded through whatever models you
 * name, using the graders' own message builders (`src/lib/ai/messages.ts`), so
 * what it measures is the prompt production actually sends. It writes nothing —
 * no `writeReport`, no `markGradingFailed`, no transcript. Point it at
 * production and it will still only read.
 *
 * The incumbent belongs in --models. Re-running it against its own stored bands
 * is the noise floor, and without that floor a half-band difference from a
 * candidate means nothing. With a thin corpus, raise --repeat instead of --n:
 * run-to-run spread, parse-failure rate and cost per submission are all
 * measurable on a handful of attempts, even when band agreement is not.
 *
 * Two deliberate omissions. Stored bands are the incumbent's output, not ground
 * truth, so "agreement" here means agreement with what we already shipped.
 * And the deterministic backstops in the graders — the length and coverage
 * ceilings, the quote filter — are applied here too, because a model is only
 * as good as the band that survives them.
 *
 * Run:
 *   pnpm --filter @bandzen/app eval:grader -- --module writing \
 *     --models gpt-5.4-mini,gpt-5.6-luna --repeat 3 --effort none
 */

const PRICES_USD_PER_MTOK: Record<
  string,
  { in: number; cached: number; out: number; audioIn?: number }
> = {
  // developers.openai.com/api/docs/pricing, fetched 2026-09-14. Prices move;
  // token counts above are the durable fact, these only turn them into dollars.
  'gpt-5.4-mini': { in: 0.75, cached: 0.075, out: 4.5 },
  'gpt-5.6-luna': { in: 0.2, cached: 0.02, out: 1.2 },
  'gpt-5.6-terra': { in: 2, cached: 0.2, out: 12 },
  'gpt-5.6-sol': { in: 4, cached: 0.4, out: 20 },
  'gpt-5.5': { in: 5, cached: 0.5, out: 30 },
  'gpt-audio-mini': { in: 0.6, cached: 0.06, out: 2.4, audioIn: 10 },
  'gpt-audio-1.5': { in: 2.5, cached: 0.25, out: 10, audioIn: 32 },
};

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  const v = i === -1 ? undefined : process.argv[i + 1];
  if (v === undefined && fallback === undefined) {
    throw new Error(`--${name} is required`);
  }
  return v ?? fallback!;
}

const MODULE = arg('module', 'writing') as 'writing' | 'speaking';
const MODELS = arg('models')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);
const LIMIT = Number(arg('n', '100'));
const REPEAT = Number(arg('repeat', '1'));
// gpt-5.4-mini defaults to 'none'; every gpt-5.6 model defaults to 'medium'.
// Leaving it unset therefore compares different amounts of thinking, and
// reasoning tokens bill as output — so pin it unless you mean to measure that.
const EFFORT = process.argv.includes('--effort') ? arg('effort') : undefined;

const sql = neon(process.env.DATABASE_URL!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const toBand = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));
const pct = (n: number, d: number) =>
  d === 0 ? '—' : `${Math.round((n / d) * 100)}%`;

function quantile(xs: number[], q: number) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** neon() returns untyped rows; one cast at the query boundary, not per field. */
type Row = Record<string, string & number & null>;

type Case = {
  attemptId: string;
  storedBand: number;
  storedCriteria: Array<{ name: string; band: number }>;
  ceiling: number;
  /** Text the grader's quotes must appear in, for the hallucination check. */
  source: string;
  messages: Awaited<ReturnType<typeof buildWritingMessages>>;
  audioTokensHint: number;
};

async function writingCases(): Promise<Case[]> {
  const rows = (await sql`
    select a.id, r.band, r.criteria, e.body, e.word_count, wp.task, wp.prompt_text
      from reports r
      join attempts a on a.id = r.attempt_id
      join essays e on e.attempt_id = a.id
      join writing_prompts wp on wp.id = a.prompt_id
     where a.module = 'writing' and a.status = 'complete' and r.model <> 'none'
     order by r.created_at desc
     limit ${LIMIT}`) as Array<Row>;

  return rows.map((r) => ({
    attemptId: r.id,
    storedBand: Number(r.band),
    storedCriteria: r.criteria ?? [],
    ceiling: writingLengthCeiling(Number(r.word_count), Number(r.task)),
    source: r.body,
    messages: buildWritingMessages({
      task: Number(r.task),
      promptText: r.prompt_text,
      wordCount: Number(r.word_count),
      body: r.body,
    }),
    audioTokensHint: 0,
  }));
}

async function speakingCases(): Promise<Case[]> {
  const attemptRows = (await sql`
    select a.id, a.speaking_test_id, r.band, r.criteria
      from reports r
      join attempts a on a.id = r.attempt_id
     where a.module = 'speaking' and a.status = 'complete' and r.model <> 'none'
     order by r.created_at desc
     limit ${LIMIT}`) as Array<Row>;

  const cases: Case[] = [];
  let skipped = 0;

  for (const a of attemptRows) {
    const prompts = (await sql`
      select sp.id as prompt_id, sp.part, sp.text,
             sr.audio_url, sr.transcript
        from speaking_prompts sp
        left join speaking_responses sr
          on sr.prompt_id = sp.id and sr.attempt_id = ${a.id}
       where sp.test_id = ${a.speaking_test_id}
       order by sp.idx`) as Array<Row>;

    // R2 objects for old attempts may be gone. A missing recording shrinks the
    // sample; it must not abort a run that took real money to get this far.
    const clips: Array<{ promptId: string; bytes: Uint8Array }> = [];
    let lost = false;
    for (const p of prompts.filter((p) => p.audio_url)) {
      const res = await fetch(p.audio_url);
      if (!res.ok) {
        lost = true;
        break;
      }
      clips.push({
        promptId: p.prompt_id,
        bytes: new Uint8Array(await res.arrayBuffer()),
      });
    }
    if (lost) {
      skipped++;
      continue;
    }

    const answered = clips.length;
    const total = prompts.length;
    cases.push({
      attemptId: a.id,
      storedBand: Number(a.band),
      storedCriteria: a.criteria ?? [],
      ceiling: speakingCoverageCeiling(answered, total),
      source: prompts
        .map((p) => p.transcript ?? '')
        .join('\n')
        .toLowerCase(),
      messages: buildSpeakingMessages(
        prompts.map((p) => ({
          promptId: p.prompt_id,
          part: Number(p.part),
          text: p.text,
        })),
        clips,
      ),
      audioTokensHint: clips.reduce((n, c) => n + c.bytes.length, 0),
    });
  }

  if (skipped)
    console.log(`skipped ${skipped} attempt(s): recordings gone from R2`);
  return cases;
}

const WRITING_SCHEMA = strictJsonSchema(writingEvaluationSchema);

async function runOne(model: string, c: Case) {
  const isAudio = model.includes('audio');
  const startedAt = Date.now();

  const response = await openai.chat.completions.create({
    model,
    messages: c.messages,
    ...(isAudio ? { modalities: ['text' as const] } : {}),
    // Audio models accept neither a response_format nor a reasoning effort.
    ...(isAudio || MODULE === 'speaking'
      ? {}
      : {
          response_format: {
            type: 'json_schema' as const,
            json_schema: {
              name: 'writing_report',
              strict: true,
              schema: WRITING_SCHEMA,
            },
          },
        }),
    ...(EFFORT && !isAudio ? { reasoning_effort: EFFORT as never } : {}),
  });

  const latencyMs = Date.now() - startedAt;
  const parsed =
    MODULE === 'writing'
      ? parseStructured(response, writingEvaluationSchema)
      : parseStructured(response, speakingEvaluationSchema);

  const kept = parsed.annotations.filter((a) =>
    MODULE === 'writing'
      ? c.source.includes(a.quote)
      : c.source.includes(a.quote.toLowerCase()),
  );

  return {
    band: Math.min(toBand(parsed.band), c.ceiling),
    criteria: parsed.criteria,
    annotations: parsed.annotations.length,
    dropped: parsed.annotations.length - kept.length,
    latencyMs,
    usage: response.usage,
  };
}

async function main() {
  const cases =
    MODULE === 'writing' ? await writingCases() : await speakingCases();
  if (!cases.length) throw new Error(`No graded ${MODULE} attempts to replay.`);

  const runs = cases.length * REPEAT;
  console.log(
    `${MODULE}: ${cases.length} attempt(s) x ${REPEAT} repeat(s) x ${MODELS.length} model(s) = ${runs * MODELS.length} calls` +
      `${EFFORT ? ` · reasoning_effort=${EFFORT}` : ' · reasoning_effort unset (defaults differ per model)'}`,
  );

  const summary = [];

  for (const model of MODELS) {
    const deltas: number[] = [];
    const spreads = new Map<string, number[]>();
    const latencies: number[] = [];
    const criterionDeltas: number[] = [];
    let promptTok = 0,
      cachedTok = 0,
      outTok = 0,
      reasoningTok = 0;
    let annotations = 0,
      dropped = 0,
      failures = 0;

    for (const c of cases) {
      for (let i = 0; i < REPEAT; i++) {
        try {
          const r = await runOne(model, c);
          deltas.push(r.band - c.storedBand);
          const seen = spreads.get(c.attemptId) ?? [];
          seen.push(r.band);
          spreads.set(c.attemptId, seen);
          latencies.push(r.latencyMs);
          annotations += r.annotations;
          dropped += r.dropped;
          for (const sc of c.storedCriteria) {
            const got = r.criteria.find((x) => x.name === sc.name);
            if (got) criterionDeltas.push(toBand(got.band) - Number(sc.band));
          }
          const u = r.usage;
          promptTok += u?.prompt_tokens ?? 0;
          cachedTok += u?.prompt_tokens_details?.cached_tokens ?? 0;
          outTok += u?.completion_tokens ?? 0;
          reasoningTok += u?.completion_tokens_details?.reasoning_tokens ?? 0;
        } catch (e) {
          failures++;
          console.error(`  ${model} ${c.attemptId}: ${(e as Error).message}`);
        }
      }
    }

    const p = PRICES_USD_PER_MTOK[model];
    const fresh = Math.max(0, promptTok - cachedTok);
    const cost = p
      ? (fresh * p.in + cachedTok * p.cached + outTok * p.out) / 1e6
      : NaN;
    const ok = deltas.length;
    const absMean = ok ? deltas.reduce((s, d) => s + Math.abs(d), 0) / ok : 0;
    // Max spread across repeats of the same attempt: the run-to-run noise floor.
    const maxSpread = Math.max(
      0,
      ...[...spreads.values()].map((b) => Math.max(...b) - Math.min(...b)),
    );

    summary.push({
      model,
      ok,
      failed: failures,
      'mean |Δband|': absMean.toFixed(2),
      'within ±0.5': pct(deltas.filter((d) => Math.abs(d) <= 0.5).length, ok),
      'mean |Δcrit|': criterionDeltas.length
        ? (
            criterionDeltas.reduce((s, d) => s + Math.abs(d), 0) /
            criterionDeltas.length
          ).toFixed(2)
        : '—',
      'max spread': REPEAT > 1 ? maxSpread.toFixed(1) : '—',
      'quotes dropped': pct(dropped, annotations),
      'p50 ms': quantile(latencies, 0.5),
      'p95 ms': quantile(latencies, 0.95),
      'cache hit': pct(cachedTok, promptTok),
      'tok in/out': `${promptTok}/${outTok}`,
      reasoning: reasoningTok,
      '$ / submission': ok ? `$${(cost / ok).toFixed(4)}` : '—',
    });
  }

  console.table(summary);
  console.log(
    '\nmean |Δband| is agreement with the band we already shipped, not with truth.\n' +
      "Read it against the incumbent's own row: a candidate is only worse if it\n" +
      'disagrees by more than the incumbent disagrees with itself (max spread).',
  );
}

await main();
