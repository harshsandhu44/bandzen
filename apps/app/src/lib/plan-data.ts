import 'server-only';

import { lessonForKindMap } from '@/content/lessons';
import { dayBounds } from '@/lib/dates';
import {
  accuracyByQuestionKind,
  attemptsSubmittedOn,
  latestBand,
  latestReport,
  listLessonProgress,
  listPassages,
  listTracks,
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
 * This exists because the dashboard and /plan built the same `PlanInput` from
 * the same eight queries, in about thirty identical lines. That duplication is
 * why the two pages drifted into showing the same thing. One caller now.
 *
 * Nothing is cached: the plan is recalculated per request on purpose, so
 * finishing a test changes today rather than next week.
 */

/**
 * Whichever modules have a measured band, to one overall figure, on IELTS's
 * half-band grid. Nulls are dropped rather than treated as zero -- an
 * unmeasured module says nothing about the candidate, so it must not pull
 * the average down.
 */
export const meanBand = (...bands: (number | null | undefined)[]) => {
  const measured = bands.filter((b): b is number => b != null);
  if (!measured.length) return null;
  return (
    Math.round((measured.reduce((sum, b) => sum + b, 0) / measured.length) * 2) /
    2
  );
};

export async function loadPlanData(
  userId: string,
  profile: Profile,
  today: string,
) {
  const { start, end } = dayBounds(today, profile.timezone);

  const [
    readingBand,
    writingBand,
    listeningBand,
    speakingBand,
    report,
    kindAccuracy,
    listeningAccuracy,
    doneToday,
    lessons,
    passages,
    prompts,
    tracks,
    lessonForKind,
  ] = await Promise.all([
    latestBand(userId, 'reading'),
    latestBand(userId, 'writing'),
    latestBand(userId, 'listening'),
    latestBand(userId, 'speaking'),
    latestReport(userId),
    accuracyByQuestionKind(userId, 'reading'),
    accuracyByQuestionKind(userId, 'listening'),
    attemptsSubmittedOn(userId, start, end),
    listLessonProgress(userId),
    listPassages(),
    listWritingPrompts(),
    listTracks(),
    lessonForKindMap(),
  ]);

  const completedLessonIds = lessons.map((l) => l.lessonId);

  const planInput: PlanInput = {
    readingBand,
    writingBand,
    listeningBand,
    targetBand: profile.targetBand,
    testDate: profile.testDate,
    weaknesses: report?.weaknesses ?? undefined,
    weakKinds: [...kindAccuracy]
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((k) => k.kind),
    catalogue: {
      passageIds: passages.map((p) => p.id),
      prompts: prompts.map((p) => ({ id: p.id, task: p.task })),
      trackIds: tracks.map((t) => t.id),
      lessonForKind,
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

  const estimated = meanBand(
    readingBand,
    writingBand,
    listeningBand,
    speakingBand,
  );

  return {
    planInput,
    plan,
    progress,
    estimated,
    readingBand,
    writingBand,
    listeningBand,
    speakingBand,
    report,
    kindAccuracy,
    listeningAccuracy,
    completedLessonIds,
    /** True once anything has actually been measured. */
    measured:
      readingBand != null ||
      writingBand != null ||
      listeningBand != null ||
      speakingBand != null,
  };
}
