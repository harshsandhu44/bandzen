import { z } from 'zod';

/**
 * The shape of everything a candidate tells us about themselves.
 *
 * One schema, used by onboarding and by settings, so the two cannot disagree
 * about what a valid target band is. Parsed from FormData, which means every
 * field arrives as a string and the coercion is part of the contract.
 */

const BAND_STEP = 0.5;

const band = z.coerce
  .number()
  .min(4, 'Target band must be between 4 and 9')
  .max(9, 'Target band must be between 4 and 9')
  .refine((n) => Number.isInteger(n / BAND_STEP), {
    message: 'Bands go in half-band steps',
  });

/** An empty form field is absent, not the string "". */
const blankToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v == null ? null : v), schema.nullable());

export const profileSchema = z.object({
  examType: z.enum(['academic', 'general']),
  targetBand: band,
  testDate: blankToNull(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Test date must be a calendar date'),
  ),
  // "I don't know" is a real answer and the reason the diagnostic exists, so
  // it is stored as null rather than guessed at.
  selfAssessedBand: blankToNull(band),
  studyMinutes: z.coerce
    .number()
    .int()
    .min(10, 'Give yourself at least ten minutes a day')
    .max(480),
  timezone: blankToNull(z.string().max(64)),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function parseProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    examType: formData.get('examType'),
    targetBand: formData.get('targetBand'),
    testDate: formData.get('testDate'),
    selfAssessedBand: formData.get('selfAssessedBand'),
    studyMinutes: formData.get('studyMinutes'),
    timezone: formData.get('timezone'),
  });
}

/** The first validation message, for a form that shows one error at a time. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again';
}

export const STUDY_MINUTE_CHOICES = [20, 30, 45, 60, 90] as const;
