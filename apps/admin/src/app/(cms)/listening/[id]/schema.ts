import { z } from 'zod';
import { questionKind } from '@bandzen/db/schema';

/** Listening allows every question kind. */
export const QUESTION_KINDS = questionKind.enumValues;

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

export const trackFormSchema = z.object({
  title: z.string().trim().min(1, 'Required'),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  transcriptText: z.string(),
  matchingOptionsText: z.string(),
  questions: z.array(questionForm),
});

export type TrackFormValues = z.infer<typeof trackFormSchema>;

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

export type SaveTrackPayload = {
  id: string;
  title: string;
  topic: string | null;
  difficulty: number;
  transcript: string | null;
  matchingOptions: string[] | null;
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

export function toSave(id: string, v: TrackFormValues): SaveTrackPayload {
  return {
    id,
    title: v.title.trim(),
    topic: v.topic.trim() || null,
    difficulty: v.difficulty,
    transcript: v.transcriptText.trim() || null,
    matchingOptions: lines(v.matchingOptionsText).length
      ? lines(v.matchingOptionsText)
      : null,
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

export const saveTrackPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  topic: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5),
  transcript: z.string().nullable(),
  matchingOptions: z.array(z.string()).nullable(),
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
