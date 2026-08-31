# app

The Bandzen product app (port 3002). Deploys to `app.bandzen.com` as its own
Vercel project with root directory `apps/app`; `apps/web` stays a separate,
static deployment.

**Stack:** Clerk (auth) · Neon (Postgres) · Drizzle (schema, migrations, types)
· OpenAI (essay grading, Bandzen Coach, offline content generation) · Zod
(form input and model output).

Reading and Writing are the modules with engines behind them. Listening and
Speaking appear in the navigation as locked states that say what is missing —
there is no audio, no transcription and no content for either, so anything that
implied otherwise would be a lie to someone paying for practice.

## Setup

1. Create a Neon project and a Clerk application, then `cp .env.example .env.local`
   and fill in the keys.
2. In Clerk: **Restrictions → Sign-up mode → Restricted**, then invite people
   from **Configure → Invitations**. That is the entire beta gate — there is no
   invite table in this app.
3. In Clerk: add `/sign-in` and `/signup` as the sign-in/sign-up paths.
4. `pnpm db:migrate` to create the schema.
5. `pnpm content:generate` → review the JSON in `content/passages/` by hand →
   `pnpm content:sql` → `pnpm db:seed`.
6. `pnpm dev` from the repo root.

| Command                 | What it does                                   |
| ----------------------- | ---------------------------------------------- |
| `pnpm db:generate`      | Write a migration from schema changes          |
| `pnpm db:migrate`       | Apply pending migrations                       |
| `pnpm db:push`          | Push schema without a migration (local only)   |
| `pnpm db:studio`        | Browse the database                            |
| `pnpm db:seed`          | Load `content/seed.sql`                        |
| `pnpm content:generate` | Generate reviewable passage JSON (costs money) |
| `pnpm content:sql`      | Build `content/seed.sql` from that JSON        |
| `pnpm test`             | Grading, study plan, insight, model output     |

## Access model

Closed beta, so there is no billing and no quota logic — the Clerk invite list
is the cap.

`src/proxy.ts` hydrates the session and deliberately does **not** gate routes.
Clerk dropped `createRouteMatcher` because middleware protection relies on path
matching, which can diverge from how Next actually routes a request and leave a
protected resource reachable. So the gate is at each resource instead: every
page calls `requireUserId()`, and `/api/coach` calls `auth()`.

`(app)/layout.tsx` calls `requireUserId()` too, but that is a data read — it
needs the profile for the target and countdown in the sidebar — not a second
gate. Every page beneath it still authenticates on its own, and every query in
`queries.ts` still takes a `userId`, so a page that forgot to authenticate has
nothing it could query.

**Onboarding** is gated in one place only: `dashboard/page.tsx` redirects to
`/onboarding` when `profiles.onboarding_completed_at` is null. `/` already
redirects to the dashboard, so that covers real entry without adding a second
place to get auth wrong. Deep links to `/reading` still work without a profile,
and show empty states rather than bouncing.

## Where isolation lives — read this before adding a query

There is no row-level security. Clerk owns identity, Neon is a plain Postgres,
and the browser holds **no** database credentials at all — every read and write
goes through server code.

That means one rule, and it is not optional:

> `src/lib/db/queries.ts` is the only module that may import `db`. Every
> function that touches a user-owned row takes `userId` as its first argument
> and filters on it.

Nothing in the database will catch a missing filter. The reason the whole data
surface is in one file is so a reviewer can check all of it at once. If you find
yourself importing `db` anywhere else, that is the bug.

Answer keys live in their own table (`question_answers`) rather than on
`questions`. Under RLS that was a hard boundary; here it is a smaller one — but
it still means a careless `select *` on `questions` cannot serialise an answer
key into a page.

## Derived, not stored — the other rule worth knowing

There are no summary tables. The study plan, today's task states, the skill
matrix, the band trend, the activity counts and the dashboard insight are all
computed from `attempts`, `attempt_answers`, `reports` and `lesson_progress`
every time they are read.

That is on purpose. A stored plan row and the attempt behind it can disagree;
a derived one cannot. It also means finishing a test changes tomorrow's plan
immediately, with no regeneration step to forget.

So before adding `skill_progress`, `band_history` or `study_plan_tasks`: the
figure you want is almost certainly a query away, and the table would be a
second source of truth that goes stale silently. Add one only when a candidate
records something the attempts genuinely do not capture.

The engines live in pure, tested modules for the same reason — `grading.ts`,
`study-plan.ts` and `insight.ts` take their inputs as arguments and touch no
database, so `pnpm test` covers the band table, the plan rotation, the
learn-before-drill rule and the insight selection without a fixture.

## Where things live

```
src/app/(app)/          the signed-in shell: layout, nav, mobile-nav
  dashboard/            what to do next
  onboarding/           six answers, one form, one action
  plan/ learn/ practice/ tests/ review/ coach/ progress/ resources/ settings/
  reading/ writing/     the engines, plus their attempt and review routes
  diagnostic/           composes the two engines via attempts.parent_id
src/app/api/coach/      the one route handler (see below)
src/components/app/     shared primitives: PageHeader, Metric, EmptyState, …
src/components/…/       feature components, one directory per domain
src/content/            authored lessons and resources (TypeScript, not rows)
src/lib/db/             schema.ts and queries.ts — see the isolation rule above
src/lib/ai/             client, models, rubric, schemas, grade-essay, coach
src/lib/                pure logic: grading, study-plan, insight, dates, profile
content/                generated passage JSON, prompts, and seed.sql
```

Routes are flat rather than nested under `/dashboard/**`, and the engines keep
the URLs they shipped with. `/practice` is a hub that links to `/reading` and
`/writing`; `/review/[attemptId]` resolves to whichever marking screen the
attempt needs instead of duplicating either.

## Server actions, and the one route handler

Every write and almost every read is a server action called from a server
component. There is exactly one route handler in the app, `POST /api/coach`,
and it exists because streaming genuinely needs it — a server action resolves
to a value, so a chat built on one sits silent and then appears all at once.

It is not a precedent. It authenticates itself with `auth()` like every page
does, and it assembles what the model is told about the candidate server-side
from their own rows, so nothing the client sends can widen what Coach sees. If
you are about to add a second handler, check first whether an action would do.

## The exam engines

Reading and Writing share three contracts. Breaking any of them loses a
candidate's work, which is the worst thing this app can do.

**Autosave never fails silently.** `useAutosave` debounces per key, retries
with backoff, and re-reads the newest payload on each attempt so a retry cannot
write a stale value over a newer one. When the retries are exhausted it shows
`Not saved` with a retry the candidate can press. Do not reintroduce a
`.catch(() => {})` — that was the bug this replaced.

**Submitting is idempotent and asks first.** `submitReading` guards its final
UPDATE on `status = 'in_progress'`, so a double submit updates zero rows rather
than rescoring. The confirmation dialog says what is unfinished — the
unanswered count, or that unsaved work may be lost — instead of a bare "are you
sure".

**Grading runs past the response.** `submitEssay` claims the attempt with
`claimForGrading` (atomic, so exactly one grader run ever starts) and then
`after(() => gradeEssay(id))`, so a thirty-second model call does not hold the
redirect and the candidate can close the tab. Every exit path in `gradeEssay`
must leave `attempts.status` terminal — a row stuck on `grading` is a report
page that polls forever.

## Content: rows, or TypeScript?

Both, split on who edits it and how often.

| Kind                                              | Lives in                     | Why                                                                                       |
| ------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| Passages, questions, answer keys, writing prompts | Neon, seeded from `content/` | Generated, per-attempt, and joined against in queries                                     |
| Lessons (`src/content/lessons.ts`)                | TypeScript                   | Prose, edited far more often than added — a wording fix should be a diff, not a migration |
| Resources (`src/content/resources.ts`)            | TypeScript                   | Same                                                                                      |
| Lesson completion                                 | Neon (`lesson_progress`)     | It is user-owned, so it is a scoped row like everything else                              |

A lesson or resource without a body is _planned and unwritten_, and the UI says
so. Do not give one an empty body to make the list look finished — a candidate
who opens a blank lesson has lost time they cannot get back.

## Estimates, not scores

Bandzen produces its own numbers. Every one of them is an **Estimated Band**,
in the interface and in anything a model is asked to say. Never "official IELTS
band", never a predicted test-day result, and never an AI-generated paper
described as an official examination. `src/lib/ai/coach.ts` states this to the
model; the UI states it to the candidate.

## Design system

Tokens come entirely from `@bandzen/ui`. This app adds only an instrumentation
type scale in `src/app/globals.css`; the marketing display scale and the `bz-*`
scroll choreography stay in `apps/web`. Dark mode is wired here and only here —
`next-themes` with `attribute="class"`, driving the `.dark` block already
authored in `packages/ui`.

Nothing in this app animates on scroll, deliberately: a timed exam surface
should not move under the candidate.

Two conventions worth keeping:

- **`--chrome` is the brand accent and never a hover.** It marks target bands,
  flags, and the evidence rule on a review — things that mean something. Hover
  uses `--secondary`.
- **Status is never colour alone.** Correct/incorrect, needs-work/improving/
  strong and task states each pair a glyph and a word with their colour. On the
  screens that tell a candidate what they got wrong, this is not optional.

Lists beat cards here. `divide-y` rows carry most of the app; a bordered block
is for something that genuinely stands apart, like Continue your plan.
