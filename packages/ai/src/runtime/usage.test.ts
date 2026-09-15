import assert from 'node:assert/strict';
import { test } from 'node:test';
import { record, tokensFrom, type AiTelemetry } from './usage.ts';

const row: AiTelemetry = {
  feature: 'coach',
  model: 'gpt-5.4-mini',
  requestId: null,
  traceId: 'trace',
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningTokens: 0,
  audioInputTokens: null,
  toolCalls: 0,
  latencyMs: 1,
  status: 'ok',
  errorCode: null,
};

test('tokensFrom maps every column off the usage block', () => {
  const t = tokensFrom({
    prompt_tokens: 4000,
    completion_tokens: 500,
    total_tokens: 4500,
    prompt_tokens_details: { cached_tokens: 3000, audio_tokens: 2760 },
    completion_tokens_details: { reasoning_tokens: 120 },
  } as never);

  assert.deepEqual(t, {
    inputTokens: 4000,
    cachedInputTokens: 3000,
    outputTokens: 500,
    reasoningTokens: 120,
    audioInputTokens: 2760,
  });
});

/**
 * A stream the reader aborted never yields a usage chunk, so this is the shape
 * the Coach's abort row is built from.
 */
test('tokensFrom on a missing usage block is zeros, not undefined', () => {
  assert.deepEqual(tokensFrom(undefined), {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    audioInputTokens: null,
  });
});

/**
 * The gate that keeps `eval-grader.mts` safe to point at production. If this
 * ever defaults on, a read-only replay starts writing rows.
 */
test('record does nothing unless a call site opts in', async () => {
  // Under `node --test` there is no DATABASE_URL and `@bandzen/db/client` is
  // `server-only`, so any attempt to reach the database throws — loudly, into
  // the catch. Completing silently is the proof it never tried.
  await record(row, undefined);
  await record(row, false);
});

/**
 * Telemetry failing must never fail a grade — the same contract
 * `apps/app/src/lib/analytics.ts` holds for PostHog.
 */
test('record never rejects, even when the write is impossible', async () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => errors.push(args);
  try {
    await assert.doesNotReject(() => record(row, true));
  } finally {
    console.error = original;
  }
  assert.equal(errors.length, 1, 'the failure is swallowed but not silent');
});
