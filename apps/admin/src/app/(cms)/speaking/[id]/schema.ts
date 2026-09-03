import { z } from 'zod';

export const PART_TITLE: Record<number, string> = {
  1: 'Part 1 — Interview',
  2: 'Part 2 — Long turn',
  3: 'Part 3 — Discussion',
};

const promptForm = z.object({
  id: z.string().optional(),
  idx: z.number().int().min(1),
  part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().trim().min(1, 'Required'),
  cueCardPointsText: z.string(),
});

export const speakingFormSchema = z.object({
  title: z.string().trim().min(1, 'Required'),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  prompts: z.array(promptForm),
});

export type SpeakingFormValues = z.infer<typeof speakingFormSchema>;

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

export type SaveSpeakingPayload = {
  id: string;
  title: string;
  topic: string | null;
  difficulty: number;
  prompts: Array<{
    id?: string;
    idx: number;
    part: 1 | 2 | 3;
    text: string;
    cueCardPoints: string[] | null;
    prepSeconds: number;
  }>;
};

export function toSave(
  id: string,
  v: SpeakingFormValues,
): SaveSpeakingPayload {
  return {
    id,
    title: v.title.trim(),
    topic: v.topic.trim() || null,
    difficulty: v.difficulty,
    prompts: v.prompts.map((p) => ({
      id: p.id,
      idx: p.idx,
      part: p.part,
      text: p.text.trim(),
      cueCardPoints: p.part === 2 ? lines(p.cueCardPointsText) : null,
      prepSeconds: p.part === 2 ? 60 : 0,
    })),
  };
}

export const saveSpeakingPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  topic: z.string().nullable(),
  difficulty: z.number().int().min(1).max(5),
  prompts: z.array(
    z.object({
      id: z.string().optional(),
      idx: z.number().int().min(1),
      part: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      text: z.string().trim().min(1),
      cueCardPoints: z.array(z.string()).nullable(),
      prepSeconds: z.number().int().min(0),
    }),
  ),
});
