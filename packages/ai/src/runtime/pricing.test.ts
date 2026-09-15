import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PRICING_VERSION,
  estimateCost,
  estimateTranscriptionCost,
} from './pricing.ts';

/**
 * The audio case is the one worth pinning. `eval-grader.mts` declared an audio
 * price and never read it, so every Speaking cost it printed was audio billed
 * at the text rate — a 9x understatement that survived months of eval runs
 * because nothing compared the two numbers (#73).
 */
test('audio input is billed apart from text, not at the text rate', () => {
  // A full 10-prompt test: ~2,760 audio tokens inside a ~4,000-token prompt.
  const tokens = {
    inputTokens: 4000,
    cachedInputTokens: 0,
    outputTokens: 400,
    audioInputTokens: 2760,
  };

  const cost = estimateCost('gpt-audio-mini', tokens)!;
  // fresh 1240 @ $0.60 + audio 2760 @ $10 + out 400 @ $2.40
  assert.equal(cost.toFixed(6), (0.029304).toFixed(6));

  // What the bug produced: the whole prompt at the text rate.
  const atTextRate = estimateCost('gpt-audio-mini', {
    ...tokens,
    audioInputTokens: 0,
  })!;
  assert.ok(
    cost > atTextRate * 5,
    `audio must cost far more than text: ${cost} vs ${atTextRate}`,
  );
});

test('audio tokens are subtracted from the prompt, not added to it', () => {
  // Same prompt total, all of it audio — the text component is zero, not 4000.
  const cost = estimateCost('gpt-audio-mini', {
    inputTokens: 2760,
    cachedInputTokens: 0,
    outputTokens: 0,
    audioInputTokens: 2760,
  })!;
  assert.equal(cost.toFixed(6), ((2760 * 10) / 1e6).toFixed(6));
});

test('cached input is cheaper than fresh input', () => {
  const fresh = estimateCost('gpt-5.4-mini', {
    inputTokens: 10_000,
    cachedInputTokens: 0,
    outputTokens: 0,
  })!;
  const cached = estimateCost('gpt-5.4-mini', {
    inputTokens: 10_000,
    cachedInputTokens: 10_000,
    outputTokens: 0,
  })!;
  assert.ok(cached < fresh);
  assert.equal(cached.toFixed(6), ((10_000 * 0.075) / 1e6).toFixed(6));
});

/**
 * Postgres `numeric` accepts 'NaN', and one NaN row makes SUM() over the
 * column NaN forever. An unpriced model has to land null.
 */
test('an unknown model costs null, never NaN', () => {
  const cost = estimateCost('gpt-9-does-not-exist', {
    inputTokens: 100,
    cachedInputTokens: 0,
    outputTokens: 10,
  });
  assert.equal(cost, null);
});

test('a known model never returns NaN for any finite input', () => {
  const cost = estimateCost('gpt-5.5', {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    audioInputTokens: null,
  });
  assert.equal(cost, 0);
  assert.ok(!Number.isNaN(cost));
});

test('transcription is priced per minute, and null without a duration', () => {
  assert.equal(estimateTranscriptionCost('whisper-1', 120), 0.012);
  assert.equal(estimateTranscriptionCost('whisper-1', null), null);
  assert.equal(estimateTranscriptionCost('whisper-1', undefined), null);
  assert.equal(estimateTranscriptionCost('not-a-model', 120), null);
});

test('the pricing version is a date, so a stored cost can be dated', () => {
  assert.match(PRICING_VERSION, /^\d{4}-\d{2}-\d{2}$/);
});
