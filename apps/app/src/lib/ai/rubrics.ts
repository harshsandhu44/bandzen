import type { ExamKey } from '@bandzen/exams/registry';
import { WRITING_RUBRIC } from './rubric.ts';
import { SPEAKING_RUBRIC } from './speaking-rubric.ts';
import { PTE_SPEAKING_RUBRIC, PTE_WRITING_RUBRIC } from './pte-rubrics.ts';

export type RubricFamily = 'writing' | 'speaking';

/**
 * Which examiner prompt grades which exam's productive tasks. Each rubric is a
 * static string sent first and byte-identical on every call, which is what
 * keeps prompt caching working. An exam without a rubric throws rather than
 * being graded against IELTS's.
 */
const RUBRICS: Partial<Record<ExamKey, Partial<Record<RubricFamily, string>>>> =
  {
    ielts: { writing: WRITING_RUBRIC, speaking: SPEAKING_RUBRIC },
    pte_academic: {
      writing: PTE_WRITING_RUBRIC,
      speaking: PTE_SPEAKING_RUBRIC,
    },
  };

export function rubricFor(exam: ExamKey, family: RubricFamily): string {
  const rubric = RUBRICS[exam]?.[family];
  if (!rubric) throw new Error(`No ${family} rubric for ${exam}`);
  return rubric;
}
