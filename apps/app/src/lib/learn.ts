import 'server-only';

import { listLessons } from '@bandzen/db/queries';
import { GROUP_TITLE } from '@/lib/db/schema';
import { accuracyByQuestionKind, listLessonProgress } from '@/lib/db/queries';
import { IELTS_MODULES, type IELTSModule } from '@/lib/modules';

/**
 * Cross-module state for the Learn hub. The module pages compute their own
 * progress from `lessonsForModule`; this is the four-module summary the hub
 * needs and nothing more.
 *
 * A lesson counts toward `total` only if it is written (`stages` present) --
 * a planned-but-unwritten row is not something you can finish.
 */

export type LearnModuleOverview = {
  module: IELTSModule;
  done: number;
  total: number;
  next: { slug: string; title: string; minutes: number } | null;
};

export async function learnOverview(
  userId: string,
): Promise<LearnModuleOverview[]> {
  const [rows, progress] = await Promise.all([
    listLessons({ status: 'published' }),
    listLessonProgress(userId),
  ]);
  const done = new Set(progress.map((p) => p.lessonId)); // keyed by slug

  return IELTS_MODULES.map((module) => {
    // listLessons is ordered (module, group, orderIndex), so array order is
    // the order the module page shows.
    const written = rows.filter(
      (r) => r.module === module && r.stages && r.stages.length > 0,
    );
    const next = written.find((r) => !done.has(r.slug));
    return {
      module,
      done: written.filter((r) => done.has(r.slug)).length,
      total: written.length,
      next: next
        ? { slug: next.slug, title: next.title, minutes: next.minutes }
        : null,
    };
  });
}

export type LearnNextStep = {
  module: IELTSModule;
  slug: string;
  title: string;
  minutes: number;
  reason: string;
} | null;

/**
 * The hub's "Start next". Mirrors the study plan's LEARN-before-PRACTICE rule:
 * the lesson for the weakest question kind you have not finished, else simply
 * the next unstarted lesson in course order.
 */
export async function nextLearnStep(userId: string): Promise<LearnNextStep> {
  const [rows, progress, accuracy] = await Promise.all([
    listLessons({ status: 'published' }),
    listLessonProgress(userId),
    accuracyByQuestionKind(userId),
  ]);
  const done = new Set(progress.map((p) => p.lessonId));
  const unfinished = rows.filter(
    (r) => r.stages && r.stages.length > 0 && !done.has(r.slug),
  );
  if (!unfinished.length) return null;

  const weakestFirst = [...accuracy]
    .filter((k) => k.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .map((k) => k.kind);

  for (const kind of weakestFirst) {
    const lesson = unfinished.find((r) => r.questionKind === kind);
    if (lesson) {
      return {
        module: lesson.module,
        slug: lesson.slug,
        title: lesson.title,
        minutes: lesson.minutes,
        reason: 'Your weakest question type so far',
      };
    }
  }

  const first = unfinished[0]!;
  return {
    module: first.module,
    slug: first.slug,
    title: first.title,
    minutes: first.minutes,
    reason: `Next in ${GROUP_TITLE[first.group]}`,
  };
}
