import type { LessonStage, Skill } from '@bandzen/db/schema';

export type LessonSeed = {
  slug: string;
  module: Skill;
  group: 'foundations' | 'question-types' | 'advanced';
  title: string;
  summary: string;
  minutes: number;
  questionKind?:
    | 'true_false_not_given'
    | 'yes_no_not_given'
    | 'multiple_choice'
    | 'matching_headings'
    | 'sentence_completion'
    | 'matching'
    | null;
  orderIndex: number;
  stages: LessonStage[];
};
