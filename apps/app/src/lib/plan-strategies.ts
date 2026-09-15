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
    }
  },
};

const PLAN_STRATEGIES: Partial<Record<ExamKey, PlanStrategy>> = {
  ielts: IELTS_PLAN,
};

export function planStrategyFor(exam: ExamKey): PlanStrategy | null {
  return PLAN_STRATEGIES[exam] ?? null;
}
