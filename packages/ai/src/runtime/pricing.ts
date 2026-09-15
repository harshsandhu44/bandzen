/**
 * What a call cost, in dollars.
 *
 * Token counts are the durable fact and live in `ai_usage`; this only turns
 * them into money, and it does so under a version stamp because prices move
 * and a dollar figure with no date on it cannot be audited later.
 *
 * One copy, deliberately. `scripts/eval-grader.mts` used to carry its own,
 * which is how it came to declare an audio price and never read it — every
 * Speaking figure it printed for months was audio billed at the text rate
 * (#73). A second table is a second thing to get wrong.
 */

/** Bump when a price below changes, so old rows stay interpretable. */
export const PRICING_VERSION = '2026-09-14';

type Price = {
  /** USD per million fresh input tokens. */
  in: number;
  /** USD per million cached input tokens. */
  cached: number;
  /** USD per million output tokens. Reasoning tokens bill at this rate. */
  out: number;
  /** USD per million audio input tokens, where audio is priced apart from text. */
  audioIn?: number;
};

/** developers.openai.com/api/docs/pricing, fetched 2026-09-14. */
export const PRICES_USD_PER_MTOK: Record<string, Price> = {
  'gpt-5.4-mini': { in: 0.75, cached: 0.075, out: 4.5 },
  'gpt-5.6-luna': { in: 0.2, cached: 0.02, out: 1.2 },
  'gpt-5.6-terra': { in: 2, cached: 0.2, out: 12 },
  'gpt-5.6-sol': { in: 4, cached: 0.4, out: 20 },
  'gpt-5.5': { in: 5, cached: 0.5, out: 30 },
  'gpt-audio-mini': { in: 0.6, cached: 0.06, out: 2.4, audioIn: 10 },
  // Deprecated alongside the above on 2027-01-20; priced here because
  // `eval-speaking-audio.mts` benchmarks it. Neither audio model has a
  // published cached-input price, so `cached` mirrors `in` and the cached
  // column reads 0 on this path regardless — see models.ts.
  'gpt-audio': { in: 2.5, cached: 2.5, out: 10, audioIn: 32 },
  'gpt-audio-1.5': { in: 2.5, cached: 2.5, out: 10, audioIn: 32 },
};

/** USD per minute of audio. Transcription is not priced per token. */
const TRANSCRIBE_USD_PER_MINUTE: Record<string, number> = {
  'whisper-1': 0.006,
};

/**
 * Audio input arrives already counted in `prompt_tokens`, so it has to be
 * subtracted out before the remainder is billed at the text rate — billing the
 * whole prompt at `in` understates a Speaking call by roughly the audio share,
 * which is 17x underpriced on `gpt-audio-mini` and 13x on `gpt-audio-1.5`.
 *
 * Null for a model absent from the table: an unpriced call is an unknown cost,
 * not a free one, and the column is nullable so it can say so.
 */
export function estimateCost(
  model: string,
  tokens: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    audioInputTokens?: number | null;
  },
): number | null {
  const p = PRICES_USD_PER_MTOK[model];
  if (!p) return null;

  const audio = tokens.audioInputTokens ?? 0;
  const fresh = Math.max(
    0,
    tokens.inputTokens - tokens.cachedInputTokens - audio,
  );
  const cost =
    (fresh * p.in +
      tokens.cachedInputTokens * p.cached +
      audio * (p.audioIn ?? p.in) +
      tokens.outputTokens * p.out) /
    1e6;
  // Postgres `numeric` accepts 'NaN' as a legal value, and one NaN row turns
  // every SUM() over this column into NaN for good. Null is the honest answer
  // and aggregates skip it.
  return Number.isFinite(cost) ? cost : null;
}

/** Transcription, priced per minute of audio rather than per token. */
export function estimateTranscriptionCost(
  model: string,
  seconds: number | null | undefined,
): number | null {
  const perMinute = TRANSCRIBE_USD_PER_MINUTE[model];
  if (perMinute === undefined || seconds == null) return null;
  return (seconds / 60) * perMinute;
}
