import type { ExamKey } from '@bandzen/exams/registry';
import type { PlanStrategy, PlanTarget } from './study-plan.ts';

/**
 * How each exam's study plan is built: its drills, what they open, and where
 * that lives. `study-plan.ts` is the shared engine; nothing IELTS-shaped is
 * allowed back into it. An exam without a strategy gets no plan rather than
 * IELTS's.
 */

/**
 * Rotate through what is available so two consecutive days on one skill do
 * not hand back the same material. An empty list yields null, and the task
 * renders without a Continue button rather than with one that goes nowhere.
 */
function pick<T>(items: readonly T[] | undefined, nth: number): T | null {
  if (!items?.length) return null;
  return items[nth % items.length]!;
}

export const IELTS_PLAN: PlanStrategy = {
  // Speaking is Pro-only and never drilled here.
  plannable: ['listening', 'reading', 'writing'],
  startingRotation: ['reading', 'writing'],
  meaningfulGap: 1,
  scoreNoun: 'band',
  noEstimateAction: 'Take the diagnostic to get your first estimate.',
  drills: {
    reading: [
      { label: 'True / False / Not Given drill', minutes: 25 },
      { label: 'Matching headings drill', minutes: 25 },
      { label: 'Sentence completion under timing', minutes: 20 },
      { label: 'Full passage, timed', minutes: 40 },
    ],
    listening: [
      { label: 'One section, note completion under timing', minutes: 15 },
      { label: 'Matching and multiple choice, one section', minutes: 15 },
      { label: 'Full track, played once', minutes: 30 },
      { label: 'Section 3 and 4 back to back', minutes: 20 },
    ],
    writing: [
      { label: 'Task 2 essay, full timing', minutes: 40, task: 2 },
      { label: 'Task 2 introduction and thesis only', minutes: 15, task: 2 },
      {
        label: 'Paragraph development from a weak body paragraph',
        minutes: 25,
        task: 2,
      },
      { label: 'Task 1 summary, full timing', minutes: 20, task: 1 },
    ],
  },
  // An absent catalogue keeps every drill, so a plan built without one is
  // unchanged; a present one drops writing drills no prompt can satisfy.
  canSchedule: (skill, drill, catalogue) =>
    skill !== 'writing' ||
    !catalogue?.prompts?.length ||
    catalogue.prompts.some((p) => p.task === drill.task),
  targetFor(skill, drill, catalogue, nth): PlanTarget | null {
    if (skill === 'reading') {
      const passageId = pick(catalogue?.passageIds, nth);
      return passageId ? { kind: 'reading', passageId } : null;
    }
    if (skill === 'listening') {
      const trackId = pick(catalogue?.trackIds, nth);
      return trackId ? { kind: 'listening', trackId } : null;
    }
    if (skill === 'writing') {
      // Rotate within the drill's own task, so the prompt that opens is the
      // kind of exercise the label just promised.
      const forTask = catalogue?.prompts?.filter((p) => p.task === drill.task);
      const prompt = pick(forTask, nth);
      return prompt ? { kind: 'writing', promptId: prompt.id } : null;
    }
    return null;
  },
  lessonSkill: 'reading',
  feedbackSkill: 'writing',
  href(skill, target) {
    switch (target.kind) {
      case 'reading':
        return `/reading?passage=${target.passageId}`;
      case 'writing':
        return `/writing?prompt=${target.promptId}`;
      case 'listening':
        return `/listening?track=${target.trackId}`;
      case 'lesson':
        // Lesson routes are module-scoped, and the task's skill is that module.
        return `/learn/${skill}/${target.lessonId}`;
      case 'exam_task':
        // IELTS content is passages and prompts, never exam tasks, so its own
        // `targetFor` cannot produce one of these.
        throw new Error('IELTS plans do not open exam tasks');
    }
  },
};

/**
 * PTE's content is task items, so every drill names the task type it opens and
 * the plan points straight at that task's practice route. Nothing here is
 * scheduled unless the CMS has published an item of it — a plan that opens an
 * empty task type is worse than a shorter plan.
 */
export const PTE_PLAN: PlanStrategy = {
  plannable: ['speaking', 'writing', 'reading', 'listening'],
  // PTE opens with Speaking & Writing, so the plan does too.
  startingRotation: ['speaking', 'reading'],
  // On a 10-90 scale a single point means nothing; five is about the smallest
  // gap worth calling a weak skill.
  meaningfulGap: 5,
  scoreNoun: 'score',
  noEstimateAction: 'Sit a full mock to get your first estimate.',
  drills: {
    speaking: [
      {
        label: 'Read Aloud, one take each',
        minutes: 15,
        taskType: 'read_aloud',
      },
      {
        label: 'Repeat Sentence drill',
        minutes: 15,
        taskType: 'repeat_sentence',
      },
      {
        label: 'Describe Image, timed',
        minutes: 20,
        taskType: 'describe_image',
      },
      {
        label: 'Re-tell Lecture, timed',
        minutes: 20,
        taskType: 'retell_lecture',
      },
    ],
    writing: [
      {
        label: 'Summarize Written Text, one sentence',
        minutes: 20,
        taskType: 'summarize_written_text',
      },
      {
        label: 'Write Essay, full timing',
        minutes: 25,
        taskType: 'write_essay',
      },
      {
        label: 'Summarize Spoken Text',
        minutes: 20,
        taskType: 'summarize_spoken_text',
      },
    ],
    reading: [
      {
        label: 'Fill in the Blanks, drag and drop',
        minutes: 20,
        taskType: 'reading_fill_in_the_blanks',
      },
      {
        label: 'Reading & Writing blanks',
        minutes: 20,
        taskType: 'reading_writing_fill_in_the_blanks',
      },
      {
        label: 'Re-order Paragraphs',
        minutes: 15,
        taskType: 'reorder_paragraphs',
      },
      {
        label: 'Multiple choice, multiple answers',
        minutes: 15,
        taskType: 'reading_multiple_choice_multiple',
      },
    ],
    listening: [
      {
        label: 'Write from Dictation drill',
        minutes: 15,
        taskType: 'write_from_dictation',
      },
      {
        label: 'Highlight Incorrect Words',
        minutes: 15,
        taskType: 'highlight_incorrect_words',
      },
      {
        label: 'Summarize Spoken Text, timed',
        minutes: 20,
        taskType: 'summarize_spoken_text',
      },
      {
        label: 'Select Missing Word',
        minutes: 15,
        taskType: 'select_missing_word',
      },
    ],
  },
  canSchedule: (_skill, drill, catalogue) =>
    !drill.taskType ||
    !catalogue?.examTaskTypes ||
    catalogue.examTaskTypes.includes(drill.taskType),
  targetFor: (_skill, drill, catalogue) =>
    drill.taskType && catalogue?.examTaskTypes?.includes(drill.taskType)
      ? { kind: 'exam_task', taskType: drill.taskType }
      : null,
  // PTE has no lesson library yet, and no written report to quote back.
  lessonSkill: null,
  feedbackSkill: null,
  href(_skill, target) {
    if (target.kind !== 'exam_task') {
      throw new Error('PTE plans only open exam tasks');
    }
    return `/practice/pte_academic/${target.taskType}`;
  },
};

const PLAN_STRATEGIES: Partial<Record<ExamKey, PlanStrategy>> = {
  ielts: IELTS_PLAN,
  pte_academic: PTE_PLAN,
};

export function planStrategyFor(exam: ExamKey): PlanStrategy | null {
  return PLAN_STRATEGIES[exam] ?? null;
}
