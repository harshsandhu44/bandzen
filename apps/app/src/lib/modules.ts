import type { Skill } from '@/lib/db/schema';

/**
 * The four IELTS modules as the interface talks about them.
 *
 * Now identical in membership to the `attempt_module` enum — every module has
 * an engine. Kept as its own list rather than derived from the enum because
 * `IELTSModule` is the vocabulary the navigation and marketing copy use, and
 * `Skill` is the type of anything that creates a row; they happen to coincide
 * today but mean different things.
 */
export const IELTS_MODULES = [
  'listening',
  'reading',
  'writing',
  'speaking',
] as const;

export type IELTSModule = (typeof IELTS_MODULES)[number];

/** The modules with a working engine behind them. */
export const AVAILABLE_MODULES: readonly Skill[] = [
  'reading',
  'writing',
  'listening',
  'speaking',
];

export function isAvailable(module: IELTSModule): module is Skill {
  return (AVAILABLE_MODULES as readonly string[]).includes(module);
}

export const MODULE_LABEL: Record<IELTSModule, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

/** Why a module is not yet openable. Shown verbatim, so it stays honest. */
export const UNAVAILABLE_REASON: Record<string, string> = {};

export type IELTSExamType = 'academic' | 'general';

export type SkillLevel = 'needs-work' | 'improving' | 'strong';

export type StudyTaskStatus = 'pending' | 'active' | 'completed';

/** Human labels for the question kinds, used everywhere a kind is displayed. */
export const QUESTION_KIND_LABEL = {
  true_false_not_given: 'True / False / Not Given',
  yes_no_not_given: 'Yes / No / Not Given',
  multiple_choice: 'Multiple choice',
  matching_headings: 'Matching headings',
  sentence_completion: 'Sentence completion',
  matching: 'Matching',
} as const;

export type QuestionKind = keyof typeof QUESTION_KIND_LABEL;
