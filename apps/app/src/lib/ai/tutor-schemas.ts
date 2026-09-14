import { z } from 'zod';

import { QUESTION_KIND_LABEL, type QuestionKind } from '../modules.ts';

/**
 * The parameter schemas for the Tutor's tools.
 *
 * Split out of `tutor-tools.ts` for one reason: that file imports `server-only`
 * and the data layer, so a test cannot load it, and the invariant below is the
 * one thing here that genuinely must not regress. Same trade as `messages.ts`.
 *
 * **No schema may name a user, an account or an id belonging to one.** The
 * model chooses tool arguments, so a userId it can name is a userId it can
 * change, and every tool instead closes over the authenticated one.
 * `tutor-schemas.test.ts` enforces that rather than leaving it to review.
 */

export const SKILL = z.enum(['reading', 'writing', 'listening']);

export const getTodayPlanSchema = z.object({});

export const findLessonSchema = z.object({
  skill: SKILL,
  topic: z
    .string()
    .nullable()
    .describe('Optional words to match against lesson titles.'),
});

export const findPracticeSchema = z.object({
  skill: SKILL,
  questionKind: z
    .enum(Object.keys(QUESTION_KIND_LABEL) as [QuestionKind, ...QuestionKind[]])
    .nullable()
    .describe(
      'Optional IELTS question type. Reading and Listening only; ignored for Writing.',
    ),
});

/** Every tool's parameter schema, so a test can check the set rather than a list. */
export const TUTOR_SCHEMAS = {
  get_today_plan: getTodayPlanSchema,
  find_lesson: findLessonSchema,
  find_practice: findPracticeSchema,
} as const;
