import 'server-only';

import { LESSON_FOR_KIND } from '@/content/lessons';
import { dayBounds } from '@/lib/dates';
import {
  accuracyByQuestionKind,
  attemptsSubmittedOn,
  latestBand,
  latestReport,
  listLessonProgress,
  listPassages,
  listWritingPrompts,
} from '@/lib/db/queries';
import type { Profile } from '@/lib/db/schema';
import {
  buildPlan,
  derivePlanState,
  tasksOn,
  type PlanInput,
} from '@/lib/study-plan';

/**
 * Everything a screen needs to show the study plan.
 *
 * This exists because /dashboard and /plan each built the same `PlanInput` from
 * the same eight queries, in about thirty identical lines. That duplication is
 * why the two pages drifted into showing the same thing. One caller now.
 *
 * Nothing is cached: the plan is recalculated per request on purpose, so
 * finishing a test changes today rather than next week.
 */

/** Reading and writing to one overall figure, on IELTS's half-band grid. */
export const meanBand = (a: number, b: number) =>
  Math.round(((a + b) / 2) * 2) / 2;

export async function loadPlanData(
  userId: string,
  profile: Profile,
  today: string,
) {
  const { start, end } = dayBounds(today, profile.timezone);

  const [
    readingBand,
    writingBand,
    report,
    kindAccuracy,
    doneToday,
    lessons,
    passages,
    prompts,
  ] = await Promise.all([
    latestBand(userId, 'reading'),
    latestBand(userId, 'writing'),
    latestReport(userId),
    accuracyByQuestionKind(userId),
    attemptsSubmittedOn(userId, start, end),
    listLessonProgress(userId),
    listPassages(),
    listWritingPrompts(),
  ]);

  const completedLessonIds = lessons.map((l) => l.lessonId);

  const planInput: PlanInput = {
    readingBand,
    writingBand,
    targetBand: profile.targetBand,
    testDate: profile.testDate,
    weaknesses: report?.weaknesses ?? undefined,
    weakKinds: [...kindAccuracy]
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((k) => k.kind),
    catalogue: {
      passageIds: passages.map((p) => p.id),
      promptIds: prompts.map((p) => p.id),
      lessonForKind: LESSON_FOR_KIND,
      completedLessonIds,
    },
  };

  const plan = buildPlan(planInput);

  const progress = derivePlanState(
    tasksOn(plan, today),
    {
      modulesCompletedToday: doneToday.map((a) => a.module),
      completedLessonIds,
    },
    profile.studyMinutes,
  );

  const estimated =
    readingBand != null && writingBand != null
      ? meanBand(readingBand, writingBand)
      : (readingBand ?? writingBand);

  return {
    planInput,
    plan,
    progress,
    estimated,
    readingBand,
    writingBand,
    report,
    kindAccuracy,
    completedLessonIds,
    /** True once anything has actually been measured. */
    measured: readingBand != null || writingBand != null,
  };
}
