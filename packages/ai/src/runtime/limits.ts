import type { AiFeature } from '../models.ts';

/**
 * Runaway bounds — **not** tuned limits.
 *
 * Each is roughly 3-4x the largest output its schema can produce, so no
 * legitimate call reaches one. That headroom is deliberate: `parseStructured`
 * throws on `finish_reason === 'length'`, and both graders turn that throw into
 * a failed attempt on a test the candidate completed (#74). A cap set close to
 * the expected size would manufacture that failure, and #75's retry re-sends
 * identical input, so it would fail twice.
 *
 * What these bound is the pathological tail — a model that loops on
 * `gpt-5.5` at $30/M output. Re-set them from `ai_usage` output-token p99 once
 * there is enough traffic to have a p99; there is none today, which is why
 * these are reasoned from schema size rather than measured.
 *
 * A writing report is 4 criteria + <=8 annotations + 3 strengths + 3
 * weaknesses, ~1.2k tokens. Content generation is the outlier: a passage runs
 * to 900 words plus its questions.
 */
export const MAX_OUTPUT_TOKENS: Record<AiFeature, number> = {
  writing_grader: 4000,
  speaking_grader: 4000,
  coach: 2000,
  /** Unchanged from `tutor.ts` — the one budget that was already enforced. */
  tutor: 800,
  content_generator: 16000,
  /** Transcription returns the candidate's words, not a generated answer. */
  transcribe: 0,
};
