import { z } from 'zod';
import { LESSON_STAGES, type LessonBlock } from '@bandzen/db/schema';

export const BLOCK_KINDS = [
  'prose',
  'steps',
  'checklist',
  'callout',
  'example',
  'try',
] as const;

/** One flat shape covers every block kind; toSave narrows by `kind`. */
const blockForm = z.object({
  kind: z.enum(BLOCK_KINDS),
  body: z.string(),
  itemsText: z.string(),
  calloutTone: z.enum(['note', 'warning']),
  title: z.string(),
  source: z.string(),
  question: z.string(),
  answer: z.string(),
  why: z.string(),
});
export type BlockFormValues = z.infer<typeof blockForm>;

const stageForm = z.object({
  id: z.enum(LESSON_STAGES),
  present: z.boolean(),
  blocks: z.array(blockForm),
});

export const lessonFormSchema = z.object({
  title: z.string().trim().min(1, 'Required'),
  summary: z.string().trim().min(1, 'Required'),
  minutes: z.number().int().min(1),
  questionKind: z.string(),
  stages: z.array(stageForm),
});
export type LessonFormValues = z.infer<typeof lessonFormSchema>;

export const blankBlock = (): BlockFormValues => ({
  kind: 'prose',
  body: '',
  itemsText: '',
  calloutTone: 'note',
  title: '',
  source: '',
  question: '',
  answer: '',
  why: '',
});

const lines = (s: string) =>
  s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

function toBlock(b: BlockFormValues): LessonBlock {
  switch (b.kind) {
    case 'prose':
      return { kind: 'prose', body: b.body.trim() };
    case 'steps':
      return { kind: 'steps', items: lines(b.itemsText) };
    case 'checklist':
      return { kind: 'checklist', items: lines(b.itemsText) };
    case 'callout':
      return {
        kind: 'callout',
        tone: b.calloutTone,
        title: b.title.trim(),
        body: b.body.trim(),
      };
    case 'example':
      return {
        kind: 'example',
        source: b.source.trim(),
        question: b.question.trim(),
        answer: b.answer.trim(),
        why: b.why.trim(),
      };
    case 'try':
      return {
        kind: 'try',
        ...(b.source.trim() ? { source: b.source.trim() } : {}),
        question: b.question.trim(),
        answer: b.answer.trim(),
        why: b.why.trim(),
      };
  }
}

export type SaveLessonPayload = {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  questionKind: string | null;
  stages: Array<{ id: (typeof LESSON_STAGES)[number]; blocks: LessonBlock[] }>;
};

export function toSave(
  id: string,
  v: LessonFormValues,
): SaveLessonPayload {
  return {
    id,
    title: v.title.trim(),
    summary: v.summary.trim(),
    minutes: v.minutes,
    questionKind: v.questionKind || null,
    stages: v.stages
      .filter((s) => s.present)
      .map((s) => ({ id: s.id, blocks: s.blocks.map(toBlock) })),
  };
}

/** Server re-validation, including the real LessonBlock union. */
const lessonBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('prose'), body: z.string() }),
  z.object({ kind: z.literal('steps'), items: z.array(z.string()) }),
  z.object({ kind: z.literal('checklist'), items: z.array(z.string()) }),
  z.object({
    kind: z.literal('callout'),
    tone: z.enum(['note', 'warning']),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal('example'),
    source: z.string(),
    question: z.string(),
    answer: z.string(),
    why: z.string(),
  }),
  z.object({
    kind: z.literal('try'),
    source: z.string().optional(),
    question: z.string(),
    answer: z.string(),
    why: z.string(),
  }),
]);

export const saveLessonPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  minutes: z.number().int().min(1),
  questionKind: z.string().nullable(),
  stages: z.array(
    z.object({
      id: z.enum(LESSON_STAGES),
      blocks: z.array(lessonBlockSchema),
    }),
  ),
});
