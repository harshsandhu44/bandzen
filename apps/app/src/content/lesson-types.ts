import type { Skill } from '@/lib/db/schema';
import type { QuestionKind } from '@/lib/modules';
import type { LessonGroupValue, LessonStage } from '@/lib/db/schema';

/**
 * The app-facing shape of a lesson, assembled from a `lessons` row by
 * `@/content/lessons` (its `id` is the row's slug). The block/stage/group
 * shapes themselves are defined once, in `@bandzen/db/schema` — re-exported
 * here so existing imports keep working unchanged.
 */

export type { LessonBlock, LessonStage, LessonStageId } from '@/lib/db/schema';
export { LESSON_STAGES, STAGE_TITLE, GROUP_TITLE } from '@/lib/db/schema';

export type LessonGroup = LessonGroupValue;

export type Lesson = {
  /** Slug. Also the value stored in lesson_progress via its slug<->id lookup. */
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
