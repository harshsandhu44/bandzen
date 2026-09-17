import 'server-only';

import { lessonForKindMap } from '@/content/lessons';
import { dayBounds } from '@/lib/dates';
import {
  accuracyByQuestionKind,
  attemptsSubmittedOn,
  latestBand,
  latestReport,
  latestScoreReports,
  listLessonProgress,
  listPassages,
  listTracks,
  listWritingPrompts,
  publishedExamTaskTypes,
} from '@/lib/db/queries';
import type { Profile } from '@/lib/db/queries';
import { planStrategyFor } from '@/lib/plan-strategies';
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
    Math.round(
      (measured.reduce((sum, b) => sum + b, 0) / measured.length) * 2,
    ) / 2
  );
};

export async function loadPlanData(
  userId: string,
  profile: Profile,
  today: string,
) {
  const { start, end } = dayBounds(today, profile.timezone);
  // Scores are read for the active exam only: another exam's are on another
  // scale and must not feed this plan or this estimate.
  const examKey = profile.examKey ?? 'ielts';
  const strategy = planStrategyFor(examKey);

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
    examTaskTypes,
    scoreReports,
  ] = await Promise.all([
    latestBand(userId, 'reading', examKey),
    latestBand(userId, 'writing', examKey),
    latestBand(userId, 'listening', examKey),
    latestBand(userId, 'speaking', examKey),
    latestReport(userId, 'writing'),
    accuracyByQuestionKind(userId, 'reading', examKey),
    accuracyByQuestionKind(userId, 'listening', examKey),
    attemptsSubmittedOn(userId, examKey, start, end),
    listLessonProgress(userId),
    listPassages(),
    listWritingPrompts(),
    listTracks(),
    lessonForKindMap(),
    publishedExamTaskTypes(examKey),
    examKey === 'pte_academic'
      ? latestScoreReports(userId, examKey, 1)
      : Promise.resolve([]),
  ]);

  const completedLessonIds = lessons.map((l) => l.lessonId);

  const planInput: PlanInput | null = strategy && {
    strategy,
    scores: {
      reading: readingBand,
      writing: writingBand,
      listening: listeningBand,
      // PTE plans speaking too — seven of its nine Speaking & Writing tasks
      // are spoken, so a plan that cannot see the skill cannot rank it.
      speaking: speakingBand,
    },
    targetScore: profile.targetScore,
    testDate: profile.testDate,
    weaknesses: report?.weaknesses ?? undefined,
    weakKinds: [...kindAccuracy]
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((k) => k.kind),
    catalogue: {
      passageIds: passages.map((p) => p.id),
      prompts: prompts.map((p) => ({ id: p.id, task: p.task })),
      trackIds: tracks.map((t) => t.id),
      examTaskTypes,
      lessonForKind,
      completedLessonIds,
    },
  };

  const plan = planInput ? buildPlan(planInput) : [];

  const progress = derivePlanState(
    tasksOn(plan, today),
    {
      completedToday: doneToday,
      completedLessonIds,
    },
    profile.studyMinutes,
  );

  // PTE's overall is its latest sitting report's, the same number the result
  // page shows — not a mean re-derived here on IELTS's half-band grid.
  const estimated =
    examKey === 'pte_academic'
      ? (scoreReports[0]?.overall ?? null)
      : meanBand(readingBand, writingBand, listeningBand, speakingBand);

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
