/**
 * Every model id in one place, each overridable by env var.
 *
 * Both ids below were confirmed against this account's /v1/models list and
 * smoke-tested with Structured Outputs. Re-check when changing them: a wrong
 * id fails at call time with a 404, not at build time, and overriding by env
 * means a correction is a redeploy rather than a code change.
 *
 * `reports.model` records which id actually graded each essay, so a few
 * hundred submissions from now you can replay them through the flagship tier
 * and decide on evidence whether the cheap grader was good enough.
 */

/** Grades essays. Runs per submission — this is the only recurring AI cost. */
export const GRADER_MODEL = process.env.OPENAI_GRADER_MODEL ?? 'gpt-5.4-mini';

/** Generates the content bank. Runs offline, once, never in a request path. */
export const CONTENT_MODEL = process.env.OPENAI_CONTENT_MODEL ?? 'gpt-5.5';

/**
 * Grades Speaking tests. Hears the candidate's audio directly, so Fluency and
 * Pronunciation are scored from evidence rather than inferred from a
 * transcript. Runs once per submitted test — the recurring cost of the
 * Speaking module.
 *
 * `gpt-audio-mini` is the cost-efficient GA audio model: audio in, text out.
 * It accepts no `response_format` (not strict Structured Outputs, not JSON
 * mode), so `grade-speaking.ts` spells the JSON shape out in the prompt and
 * `parseStructured` validates the reply. Re-check against this account's
 * /v1/models when changing it — a wrong id 404s at call time, and the env
 * override makes a correction a redeploy rather than a code change.
 *
 * DEPRECATED BY OPENAI — shutdown 2027-01-20, sole replacement `gpt-audio-1.5`.
 * Every Chat Completions audio model shuts down on that date with the same
 * replacement, so there is no lateral move. Migrate before it, not after.
 *
 * Measured 2026-09-14 by `scripts/eval-speaking-audio.mts`, on synthesized
 * fixtures (production has no speaking corpus):
 *
 * - Audio input is **10 tokens per second**, flat, on both models. A full test
 *   as the catalogue shapes it — 10 prompts, ~4.5 minutes — is ~2,760 audio
 *   tokens: **$0.031** here, **$0.099** on `gpt-audio-1.5`. The recording caps
 *   allow up to ~10 minutes, so roughly double at the ceiling.
 * - **Neither model has a cached-input price** — the pricing page shows a dash
 *   for both, and every run reads 0% cache hit however many times the same
 *   prefix is sent. The byte-identical `SPEAKING_RUBRIC` prefix has therefore
 *   never paid off on this path and will not on the replacement. It stays
 *   first because `buildSpeakingMessages` is shared, not because it caches.
 * - `gpt-audio-1.5` was **not** the blocker #70 read it as. On a full test it
 *   graded 17/17 against this model's 14/17, and on a partial one 14/14
 *   against 11/14. What it refuses is a thin submission — one or two short
 *   answers and no long turn — where it asks for the rest of the test instead
 *   of grading. This model grades those without complaint.
 * - This model's failures are **JSON-contract** failures, not hearing ones: a
 *   truncated object, or an annotation `kind` outside the enum while the prose
 *   schema asks for four to eight. Neither model accepts a `response_format`,
 *   so `SPEAKING_RESPONSE_SHAPE` is the only thing holding the shape and
 *   nothing enforces it.
 *
 * Fixtures were synthesized, because the replay corpus #70 used was dev data
 * and the preview-branch reset took it. Nothing here has heard a real
 * candidate, and a nervous one is not a TTS voice. See #72.
 */
export const SPEAKING_GRADER_MODEL =
  process.env.OPENAI_SPEAKING_GRADER_MODEL ?? 'gpt-audio-mini';

/**
 * Answers Coach chat. Split from GRADER_MODEL deliberately: grading optimises
 * for agreement with a rubric, tutoring for usefulness in conversation, and
 * one eval cannot promote a model for both. Starts on the same id the Coach
 * has always used, so splitting it changed no behaviour.
 */
export const COACH_MODEL = process.env.OPENAI_COACH_MODEL ?? 'gpt-5.4-mini';
