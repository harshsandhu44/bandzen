import { CURRENT_EXAM_VERSION, type ExamKey } from '@bandzen/exams/registry';

/**
 * Everything a candidate tells us about their preparation, in exam-neutral
 * terms. `undefined` means "not part of this save" — the diagnostic updates the
 * target and date without touching the variant — and Drizzle leaves undefined
 * fields out of an update.
 */
export type PreparationValues = {
  examKey?: ExamKey;
  examVariant?: string | null;
  targetScore?: number | null;
  selfAssessedScore?: number | null;
  testDate?: string | null;
  studyMinutes?: number | null;
  timezone?: string | null;
  onboardingCompletedAt?: Date | null;
};

/**
 * Split one save into its `exam_enrollments` row and its `profiles` row.
 *
 * The exam-specific half goes to the enrollment; the profile keeps the
 * exam-independent half plus the pointer to the active exam.
 */
export function preparationWrites(values: PreparationValues) {
  const {
    examKey = 'ielts',
    examVariant,
    targetScore,
    selfAssessedScore,
    testDate,
    ...profile
  } = values;

  return {
    enrollment: {
      examKey,
      examVersion: CURRENT_EXAM_VERSION[examKey],
      examVariant,
      targetScore,
      selfAssessedScore,
      testDate,
    },
    // Only a save that names its exam moves the active one — the diagnostic's
    // target-and-date save must not switch a PTE candidate back to IELTS.
    profile: { ...profile, activeExamKey: values.examKey },
  };
}
