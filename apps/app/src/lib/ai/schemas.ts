import { z } from 'zod';

/**
 * Every contract we hold a model to, defined once.
 *
 * These are the source of truth for both directions: `strictJsonSchema()`
 * turns them into the JSON Schema the request carries, and `parseStructured()`
 * validates the response against the same object. Nothing is hand-mirrored, so
 * the two can't drift.
 *
 * Optionality is expressed as `.nullable()`, never `.optional()` — OpenAI's
 * strict mode requires every property to be listed as required.
 */

export const CRITERION_NAMES = [
  'Task Response',
  'Coherence and Cohesion',
  'Lexical Resource',
  'Grammatical Range and Accuracy',
] as const;

export const writingEvaluationSchema = z.object({
  band: z.number().describe('Overall band, 0-9, whole or half.'),
  criteria: z.array(
    z.object({
      name: z.enum(CRITERION_NAMES),
      band: z.number(),
      comment: z.string(),
    }),
  ),
  annotations: z.array(
    z.object({
      quote: z.string().describe('Verbatim extract from the response.'),
      kind: z.enum(['good', 'grammar', 'development']),
      comment: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type WritingEvaluation = z.infer<typeof writingEvaluationSchema>;

/**
 * One generated Reading passage with its questions and answer keys.
 *
 * Shared with `scripts/generate-content.mts`, which imports it by relative
 * path — the kind list and the schema were previously two copies of the same
 * thing on either side of a boundary the script could not cross.
 *
 * The `.describe()` calls are not documentation. They are shipped to the model
 * as part of the schema and carry the IELTS rules the SYSTEM prompt cannot
 * enforce structurally, so edit them as you would edit a prompt.
 */
export const QUESTION_KINDS = [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
] as const;

export const generatedQuestionSchema = z.object({
  idx: z.int(),
  kind: z.enum(QUESTION_KINDS),
  prompt: z.string(),
  options: z
    .array(z.string())
    .nullable()
    .describe(
      'Choices for multiple_choice ONLY. Must be null for matching_headings, which draws from the passage-level headings list.',
    ),
  answer: z
    .array(z.string())
    .describe(
      'Accepted answers. One entry normally; more only where the passage genuinely supports a synonym.',
    ),
  evidence: z
    .string()
    .describe(
      'The exact sentence from body that justifies the answer, verbatim.',
    ),
  explanation: z.string(),
});

export const generatedPassageSchema = z.object({
  slug: z.string().describe('kebab-case, unique'),
  title: z.string(),
  topic: z.string(),
  difficulty: z.int().min(1).max(5),
  body: z
    .string()
    .describe(
      '700-900 words of academic prose, split into paragraphs each prefixed with a capital letter label and a newline, e.g. "A\\nThe first paragraph...".',
    ),
  headings: z
    .array(z.string())
    .describe(
      'One shared list of candidate headings covering every matching_headings question, with at least three MORE headings than there are such questions. Every heading must be a plausible summary of some part of this passage.',
    ),
  questions: z.array(generatedQuestionSchema),
});

export type GeneratedPassage = z.infer<typeof generatedPassageSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
