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
 * That replacement costs 3.2x on audio tokens and 4.2x on text, and does not
 * document prompt caching, so the pinned rubric prefix may stop paying off.
 * Migrate on eval evidence before the shutdown date, not after it.
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
