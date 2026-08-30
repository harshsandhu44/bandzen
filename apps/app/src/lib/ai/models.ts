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
