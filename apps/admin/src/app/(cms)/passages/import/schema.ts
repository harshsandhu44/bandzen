import { z } from 'zod';

/**
 * Mirrors `apps/app/src/lib/ai/schemas.ts`'s `generatedPassageSchema` — the
 * shape `scripts/generate-content.mts` produces for a human to review before
 * seeding. Duplicated rather than shared across the app/admin package
 * boundary for this one narrow use case (per the CMS migration plan); keep
 * this in sync if the source schema changes.
 */
const QUESTION_KINDS = [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
] as const;

export const importedQuestionSchema = z.object({
  idx: z.number().int(),
  kind: z.enum(QUESTION_KINDS),
  prompt: z.string(),
  options: z.array(z.string()).nullable(),
  answer: z.array(z.string()),
  evidence: z.string(),
  explanation: z.string(),
});

export const importedPassageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  body: z.string(),
  headings: z.array(z.string()),
  questions: z.array(importedQuestionSchema),
});

export type ImportedPassage = z.infer<typeof importedPassageSchema>;
