import { z } from 'zod';
import { EXAM_KEYS, getExam, isOnScale } from '@bandzen/exams/registry';

/**
 * The shape of everything a candidate tells us about their preparation.
 *
 * One schema, used by onboarding and by settings, so the two cannot disagree
 * about what a valid target is. Parsed from FormData, which means every field
 * arrives as a string and the coercion is part of the contract.
 *
 * What counts as a valid score, and whether a variant is needed, comes from
 * the chosen exam's definition: an IELTS target is a half band, a PTE target a
 * whole point from 10 to 90, and only IELTS asks Academic or General.
 */

/** An empty form field is absent, not the string "". */
const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), schema.nullable());

export const profileSchema = z
  .object({
    examKey: z.enum(EXAM_KEYS, { error: 'Choose the test you are taking' }),
    examVariant: blankToNull(z.string()),
    targetScore: z.coerce.number({ error: 'Choose a target' }),
    testDate: blankToNull(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Test date must be a calendar date'),
    ),
    // "I don't know" is a real answer and the reason the diagnostic exists, so
    // it is stored as null rather than guessed at.
    selfAssessedScore: blankToNull(z.coerce.number()),
    studyMinutes: z.coerce
      .number()
      .int()
      .min(10, 'Give yourself at least ten minutes a day')
      .max(480),
    timezone: blankToNull(z.string().max(64)),
  })
  .superRefine((v, ctx) => {
    const exam = getExam(v.examKey)!;
    const noun = exam.scoreScale.label.toLowerCase();
    const { min, max, step } = exam.scoreScale;
    const scoreRule = `a ${exam.name} ${noun} from ${min} to ${max} in steps of ${step}`;

    const variants = exam.variants.map((x) => x.key);
    if (variants.length && !variants.includes(v.examVariant ?? '')) {
      ctx.addIssue({
        code: 'custom',
        path: ['examVariant'],
        message: `Choose ${exam.variants.map((x) => x.label).join(' or ')}`,
      });
    }
    if (!Number.isFinite(v.targetScore) || !isOnScale(exam, v.targetScore)) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetScore'],
        message: `Target must be ${scoreRule}`,
      });
    }
    if (v.selfAssessedScore != null && !isOnScale(exam, v.selfAssessedScore)) {
      ctx.addIssue({
        code: 'custom',
        path: ['selfAssessedScore'],
        message: `Your estimate must be ${scoreRule}`,
      });
    }
  })
  // Only an exam with variants keeps one: a PTE enrollment never inherits a
  // stale "academic" from an IELTS form.
  .transform((v) => ({
    ...v,
    examVariant: getExam(v.examKey)!.variants.length ? v.examVariant : null,
  }));

export type ProfileInput = z.infer<typeof profileSchema>;

export function parseProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    examKey: formData.get('examKey'),
    examVariant: formData.get('examVariant'),
    targetScore: formData.get('targetScore'),
    testDate: formData.get('testDate'),
    selfAssessedScore: formData.get('selfAssessedScore'),
    studyMinutes: formData.get('studyMinutes'),
    timezone: formData.get('timezone'),
  });
}

/** The first validation message, for a form that shows one error at a time. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again';
}

export const STUDY_MINUTE_CHOICES = [20, 30, 45, 60, 90] as const;
