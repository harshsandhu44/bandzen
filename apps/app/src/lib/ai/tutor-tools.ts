import 'server-only';

import { tool } from '@openai/agents';

import { lessonsForModule } from '@/content/lessons';
import { todayIso } from '@/lib/dates';
import {
  getProfile,
  listPassages,
  listTracks,
  listWritingPrompts,
} from '@/lib/db/queries';
import { loadPlanData } from '@/lib/plan-data';
import { targetHref } from '@/lib/study-plan';
import {
  findLessonSchema,
  findPracticeSchema,
  getTodayPlanSchema,
} from './tutor-schemas.ts';

/**
 * The Tutor's tools. Read-only, and every one of them closes over the
 * authenticated `userId`.
 *
 * The rule that matters: **no tool's parameter schema declares a userId**. The
 * model chooses arguments, so a userId it could name is a userId it could
 * change. `tutor-tools.test.ts` asserts this mechanically rather than trusting
 * a reviewer to notice.
 *
 * There is deliberately no `get_learner_snapshot`. `buildCoachContext` already
 * ships exam type, target band, test date, study minutes, all four latest
 * bands, the latest report's criteria and weaknesses, and reading accuracy by
 * question kind, as a cached prefix on every single request -- a tool would be
 * a round trip for data the model has already read. Nor a `get_progress_trend`:
 * `bandHistory` exists for it, but nobody here has enough attempts to have a
 * trend yet.
 */

/** What a tool handed back, kept so the route can offer it as a real CTA. */
export type TutorAction = {
  kind: 'lesson' | 'reading' | 'writing' | 'listening';
  id: string;
  label: string;
  href: string;
};

/**
 * Builds the tool set for one request, plus the slot the chosen action lands
 * in.
 *
 * The action is recorded from what a tool *returned*, never from what the model
 * says afterwards. The model is never asked for an id, so it cannot invent one
 * -- which is a stronger guarantee than asking and then validating, and it is
 * why there is no id-checking code here.
 */
export function tutorTools(userId: string) {
  // Last write wins: if the model looks up a lesson and then a practice item,
  // the practice item is the more specific thing to offer.
  let action: TutorAction | null = null;
  const record = (a: TutorAction) => {
    action = a;
    return a;
  };

  const getTodayPlan = tool({
    name: 'get_today_plan',
    description:
      "The candidate's study plan for today: what to work on, for how long, and what it opens. Use this before recommending what to do next.",
    parameters: getTodayPlanSchema,
    async execute() {
      const profile = await getProfile(userId);
      if (!profile) return { tasks: [], note: 'This candidate has no profile.' };

      // `today` has to be resolved in the candidate's own timezone --
      // `dayBounds` inside `loadPlanData` uses it, and a UTC date returns
      // yesterday's plan for anyone east of UTC after their evening.
      const today = todayIso(profile.timezone);
      const { plan, progress } = await loadPlanData(userId, profile, today);

      const tasks = plan
        .filter((t) => t.date === today)
        .map((t) => {
          const href = targetHref(t);
          if (href && t.target) {
            record({
              kind: t.target.kind,
              id: idOf(t.target),
              label: t.label,
              href,
            });
          }
          return { skill: t.skill, label: t.label, minutes: t.minutes, href };
        });

      return {
        date: today,
        tasks,
        minutesDone: progress.minutesDone,
        note: tasks.length ? undefined : 'Nothing is scheduled for today.',
      };
    },
  });

  const findLesson = tool({
    name: 'find_lesson',
    description:
      'Find a Bandzen lesson that teaches a skill. Use this when explaining a technique the candidate could go and learn properly.',
    parameters: findLessonSchema,
    async execute({ skill, topic }) {
      const all = await lessonsForModule(skill);
      const needle = topic?.trim().toLowerCase();
      const matched = needle
        ? all.filter(
            (l) =>
              l.title.toLowerCase().includes(needle) ||
              l.summary.toLowerCase().includes(needle),
          )
        : all;

      // Fall back to the module's lessons rather than nothing: "no lesson on
      // commas" is a worse answer than "here is the grammar lesson".
      const narrowed = Boolean(needle) && matched.length > 0;
      const hits = (narrowed ? matched : all).slice(0, 5);

      // Only offer a button when the topic actually picked this lesson out.
      // Handing back the whole module and then offering its first entry gives
      // a button that contradicts the answer -- the model recommends the
      // lesson that fits the question, which is rarely the alphabetically
      // first one. No CTA beats a wrong CTA.
      if (narrowed && hits[0]) {
        record({
          kind: 'lesson',
          id: hits[0].id,
          label: hits[0].title,
          href: `/learn/${skill}/${hits[0].id}`,
        });
      }

      return hits.map((l) => ({
        id: l.id,
        title: l.title,
        summary: l.summary,
        minutes: l.minutes,
      }));
    },
  });

  const findPractice = tool({
    name: 'find_practice',
    description:
      'Find a real practice item the candidate can attempt now. Use this when recommending practice rather than describing it.',
    parameters: findPracticeSchema,
    async execute({ skill, questionKind }) {
      // A switch, not an abstraction: the three catalogues genuinely differ
      // (writing has a task number and no question kinds at all).
      const kind = questionKind ?? undefined;

      if (skill === 'writing') {
        const rows = await listWritingPrompts();
        const hits = rows.slice(0, 3);
        if (hits[0]) {
          record({
            kind: 'writing',
            id: hits[0].id,
            label: `Writing Task ${hits[0].task}`,
            href: `/writing?prompt=${hits[0].id}`,
          });
        }
        return hits.map((p) => ({
          id: p.id,
          task: p.task,
          prompt: p.promptText.slice(0, 160),
        }));
      }

      const rows =
        skill === 'reading'
          ? await listPassages({ kind })
          : await listTracks({ kind });
      const hits = rows.slice(0, 3);
      if (hits[0]) {
        record({
          kind: skill,
          id: hits[0].id,
          label: hits[0].title,
          href:
            skill === 'reading'
              ? `/reading?passage=${hits[0].id}`
              : `/listening?track=${hits[0].id}`,
        });
      }
      return hits.map((r) => ({
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
      }));
    },
  });

  return {
    tools: [getTodayPlan, findLesson, findPractice],
    /** Read after the run -- or, for the CTA header, at the first text token. */
    takeAction: () => action,
  };
}

/** The id out of a PlanTarget, whichever of the four shapes it is. */
function idOf(target: NonNullable<Parameters<typeof targetHref>[0]['target']>) {
  switch (target.kind) {
    case 'reading':
      return target.passageId;
    case 'writing':
      return target.promptId;
    case 'listening':
      return target.trackId;
    case 'lesson':
      return target.lessonId;
  }
}
