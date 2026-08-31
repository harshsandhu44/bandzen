import type { Skill } from '@/lib/db/schema';
import type { QuestionKind } from '@/lib/modules';

/**
 * The shape of a lesson.
 *
 * Bodies are authored TypeScript rather than rows: there are a few dozen of
 * them, they are edited far more often than they are added, and a reviewer
 * should be able to read a wording change as a diff instead of a migration.
 * The block union is what a database-backed lesson would have to produce, so
 * moving them later is a loader change and nothing else.
 */

export type LessonBlock =
  | { kind: 'prose'; body: string }
  | { kind: 'steps'; items: readonly string[] }
  | { kind: 'checklist'; items: readonly string[] }
  | { kind: 'callout'; tone: 'note' | 'warning'; title: string; body: string }
  | {
      kind: 'example';
      /** The extract being reasoned about. */
      source: string;
      question: string;
      answer: string;
      why: string;
    }
  | {
      /** A question the reader answers in their head before revealing. */
      kind: 'try';
      source?: string;
      question: string;
      answer: string;
      why: string;
    };

/** The six stages every lesson moves through, in order. */
export const LESSON_STAGES = [
  'understand',
  'see',
  'try',
  'practice',
  'check',
  'improve',
] as const;

export type LessonStageId = (typeof LESSON_STAGES)[number];

export const STAGE_TITLE: Record<LessonStageId, string> = {
  understand: 'Understand',
  see: 'See',
  try: 'Try',
  practice: 'Practice',
  check: 'Check',
  improve: 'Improve',
};

export type LessonStage = {
  id: LessonStageId;
  blocks: readonly LessonBlock[];
};

export type LessonGroup = 'foundations' | 'question-types' | 'advanced';

export const GROUP_TITLE: Record<LessonGroup, string> = {
  foundations: 'Foundations',
  'question-types': 'Question types',
  advanced: 'Advanced',
};

export type Lesson = {
  /** Slug. Also the value stored in lesson_progress.lesson_id. */
  id: string;
  module: Skill;
  group: LessonGroup;
  title: string;
  summary: string;
  minutes: number;
  /** The question kind this teaches, where it maps to one. Links to practice. */
  questionKind?: QuestionKind;
  /**
   * Absent means the lesson is planned but unwritten. The Learn page says so
   * rather than showing an empty page or a checkbox that means nothing.
   */
  stages?: readonly LessonStage[];
};
