import { z } from 'zod';

/** Passages use every reading kind except `matching` (that is listening-only). */
export const QUESTION_KINDS = [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
] as const;

/**
 * What the editor form holds. List fields (headings, options, answer) live as
 * newline / comma text because that is what the textarea gives back; `toSave`
 * turns the whole thing into the arrays the server action wants.
 */
const questionForm = z.object({
  id: z.string().optional(),
  idx: z.number().int().min(1),
  kind: z.enum(QUESTION_KINDS),
  prompt: z.string().trim().min(1, 'Required'),
  optionsText: z.string(),
  answerText: z.string(),
  evidence: z.string(),
  explanation: z.string(),
});

export const passageFormSchema = z.object({
  title: z.string().trim().min(1, 'Required'),
  topic: z.string(),
  format: z.enum(['academic', 'general']),
  difficulty: z.number().int().min(1).max(5),
  body: z.string().trim().min(1, 'Required'),
  headingsText: z.string(),
  questions: z.array(questionForm),
});

export type PassageFormValues = z.infer<typeof passageFormSchema>;

export type SavePassagePayload = {
  id: string;
  title: string;
  topic: string | null;
  format: 'academic' | 'general';
  difficulty: number;
  body: string;
  headings: string[];
  questions: Array<{
    id?: string;
    idx: number;
    kind: (typeof QUESTION_KINDS)[number];
    prompt: string;
    options: string[] | null;
    answer: string[];
    evidence: string | null;
    explanation: string | null;
  }>;
};

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
const commas = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export function toSave(
  id: string,
  v: PassageFormValues,
): SavePassagePayload {
  return {
    id,
    title: v.title.trim(),
    topic: v.topic.trim() || null,
    format: v.format,
    difficulty: v.difficulty,
    body: v.body.trim(),
    headings: lines(v.headingsText),
    questions: v.questions.map((q) => ({
      id: q.id,
      idx: q.idx,
      kind: q.kind,
      prompt: q.prompt.trim(),
      options: q.kind === 'multiple_choice' ? lines(q.optionsText) : null,
      answer: commas(q.answerText),
      evidence: q.evidence.trim() || null,
      explanation: q.explanation.trim() || null,
    })),
  };
}

/** Server re-validation of the payload — never trust the client's transform. */
export const savePassagePayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  topic: z.string().nullable(),
  format: z.enum(['academic', 'general']),
  difficulty: z.number().int().min(1).max(5),
  body: z.string().trim().min(1),
  headings: z.array(z.string()),
  questions: z.array(
    z.object({
      id: z.string().optional(),
      idx: z.number().int().min(1),
      kind: z.enum(QUESTION_KINDS),
      prompt: z.string().trim().min(1),
      options: z.array(z.string()).nullable(),
      answer: z.array(z.string()),
      evidence: z.string().nullable(),
      explanation: z.string().nullable(),
    }),
  ),
});
