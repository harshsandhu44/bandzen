import { z } from 'zod';
import {
  resourceCategory,
  resourceLevel,
  attemptModule,
  questionKind,
} from '@bandzen/db/schema';

export const CATEGORIES = resourceCategory.enumValues;
export const LEVELS = resourceLevel.enumValues;
export const MODULES = attemptModule.enumValues;
export const QUESTION_KINDS = questionKind.enumValues;

export const resourceFormSchema = z.object({
  title: z.string().trim().min(1, 'Required'),
  summary: z.string().trim().min(1, 'Required'),
  category: z.enum(CATEGORIES),
  level: z.enum(LEVELS),
  minutes: z.number().int().min(1),
  module: z.string(),
  questionKind: z.string(),
  bodyText: z.string(),
});

export type ResourceFormValues = z.infer<typeof resourceFormSchema>;

const paragraphs = (s: string) =>
  s
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export type SaveResourcePayload = {
  title: string;
  summary: string;
  category: (typeof CATEGORIES)[number];
  level: (typeof LEVELS)[number];
  minutes: number;
  module: (typeof MODULES)[number] | null;
  questionKind: (typeof QUESTION_KINDS)[number] | null;
  body: string[] | null;
};

export function toSave(v: ResourceFormValues): SaveResourcePayload {
  return {
    title: v.title.trim(),
    summary: v.summary.trim(),
    category: v.category,
    level: v.level,
    minutes: v.minutes,
    module: (v.module || null) as SaveResourcePayload['module'],
    questionKind: (v.questionKind ||
      null) as SaveResourcePayload['questionKind'],
    body: paragraphs(v.bodyText).length ? paragraphs(v.bodyText) : null,
  };
}

export const saveResourcePayloadSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  category: z.enum(CATEGORIES),
  level: z.enum(LEVELS),
  minutes: z.number().int().min(1),
  module: z.enum(MODULES).nullable(),
  questionKind: z.enum(QUESTION_KINDS).nullable(),
  body: z.array(z.string()).nullable(),
});
