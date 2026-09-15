import { getExam } from '@bandzen/exams/registry';

/**
 * The routes that render a full-bleed exam runner — a `-m-6 sm:-m-10` surface
 * with its own chrome, which the top bar and the mobile tab bar step aside for.
 *
 * Declared as data: IELTS's runners are `/<section>/<attemptId>` for each
 * section its definition declares (so `/reading/abc/review` is not one), and
 * the staff task lab runs any exam's tasks at `/preview/tasks/<exam>/<task>`.
 * A new exam's runner route is a new entry here, not a new condition.
 */
const RUNNER_ROUTES: readonly RegExp[] = [
  new RegExp(
    `^/(${getExam('ielts')!
      .sections.map((s) => s.key)
      .join('|')})/[^/]+$`,
  ),
  /^\/preview\/tasks\/[^/]+\/[^/]+$/,
];

export const isExamRunner = (pathname: string) =>
  RUNNER_ROUTES.some((route) => route.test(pathname));
