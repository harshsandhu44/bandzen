# admin

The Bandzen CMS (port 3003). Its own Vercel project with root directory
`apps/admin`, sharing **the same Clerk instance and the same Neon database** as
`apps/app`. Nothing here is student-facing, and `robots` is `noindex, nofollow`
on every route.

**Stack:** Clerk (auth + roles in `publicMetadata`) · Neon (Postgres, via
`@bandzen/db`) · Drizzle · Zod (the JSON import).

It exists so passages, questions, answer keys, writing prompts, lessons and
resources can be edited without a developer in the loop. Lessons and resources
used to be TypeScript literals in `apps/app/src/content/`; they are rows now,
which is what made a CMS possible at all.

## Setup

1. `cp .env.example .env.local` and fill it in. `DATABASE_URL` and both Clerk
   keys are **the same values as `apps/app`** — this is one database and one
   sign-in, not a second of each.
2. Put your own email in `ADMIN_EMAILS`. This is how the first admin exists at
   all: the `/teachers` screen grants roles, and there is nobody to grant you
   the first one.
3. `pnpm dev` from the repo root, then open http://localhost:3003.

There is no migration or seed step here. `apps/app` owns the schema, the
migrations and the content pipeline; see its README.

| Script      |                                                      |
| ----------- | ---------------------------------------------------- |
| `dev`       | Next dev server on :3003                             |
| `build`     | Production build                                     |
| `start`     | Serves the production build                          |
| `lint`      | ESLint — rules live in `@bandzen/eslint-config/next` |
| `typecheck` | `next typegen && tsc --noEmit`                       |

`experimental.authInterrupts` is on in `next.config.ts` because `forbidden()`
is gated behind it — without the flag it throws E488 instead of rendering the 403. See below for why that call matters.

## Access model

Two roles, in Clerk `publicMetadata.role`: **`admin`** and **`teacher`**. No
roles table, no rows. Teachers have full content CRUD parity with admin;
`/teachers` is the only admin-only screen, because granting a role is the one
thing a teacher cannot do.

`ADMIN_EMAILS` is a comma-separated allowlist checked _alongside_ the Clerk
role, and it is **permanent, not a bootstrap hack**. Keep it set. It is the way
back in if `publicMetadata` is ever cleared or wiped, and without it a bad
write to Clerk locks every editor out of the CMS with no recourse.

`src/proxy.ts` hydrates the session and deliberately does **not** gate routes —
the same convention as `apps/app`, for the same reason: middleware protection
relies on path matching, which can diverge from how Next actually routes a
request. The gate is at each resource. Every page calls
`requireAdminOrTeacher()` or `requireAdmin()` from `src/lib/auth.ts`.

`(cms)/layout.tsx` calls `requireAdminOrTeacher()` too, but that is a data read
— it needs the role to filter the nav and the email for the footer — **not** a
second gate. Next does not re-run layouts on client-side navigation, so a
layout must never be the only thing standing in front of a page.

### Denial does not redirect. Read this before touching `src/lib/auth.ts`

When a signed-in account has no CMS role, `requireAdminOrTeacher()` calls
`forbidden()`, which renders `src/app/forbidden.tsx` and terminates. It does
**not** redirect, and it must not start to.

This app shares its Clerk instance with `apps/app`, and on localhost the
session cookie ignores the port — so a signed-in _student_ at :3002 is a real,
valid session here at :3003. A denied session sent to another page in this app
lands on a page that is itself gated, which is precisely how `/` → `/teachers`
→ `/` became an infinite redirect loop. The structural defect was that the
denial path had no terminal state.

Three things came out of that, and each is load-bearing:

- **`forbidden()` emits no `Location` header.** There is nowhere for a loop to
  go.
- **`/` is a real page**, not a redirect at the most privileged screen.
- **The 403 page offers sign out first**, because for the case it actually
  exists to handle — the wrong account, not the wrong person — that is the fix.
  The shell's footer shows the signed-in email and role for the same reason:
  not knowing which account you were on is what made the loop confusing.

Only `redirect()` for a _missing_ session, which goes to `/sign-in` and is
Clerk's screen, not a gated one.

## Publish workflow

`status` is `draft | published` on `passages`, `writing_prompts`, `lessons` and
`resources` — passage-level, never per-question. **Students only ever see
`published` rows.**

The column's DDL default is `'published'`, and that is deliberate: those tables
held live content when the column was added, and a `'draft'` default would have
unpublished every passage in the product the instant the migration ran. New
rows created _through the CMS_ are drafts because every `create*` function in
`@bandzen/db/queries` passes `status: 'draft'` explicitly. Don't "fix" the
column default to match.

Editing a published item saves in place and stays published. There is no
versioning and no draft copy of a live row.

Two guards live in `@bandzen/db/queries` rather than here, because they join
against `attempts` and `lesson_progress` — tables that package owns:

- **Publish validation.** `publishPassage()` and friends call
  `check*Completeness()` first and throw `PublishValidationError` with an
  `issues: string[]` if the item is incomplete — a question with no answer, a
  `matching_headings` question with no headings list, a lesson with no
  non-empty stage.
- **Delete safety.** `deletePassage()` counts referencing `attempts` (and
  `deleteLesson()` counts `lesson_progress`) and throws `ContentInUseError`
  before issuing any delete, telling you to unpublish instead. The
  `onDelete: 'set null'` on `attempts.passage_id` is **not** the safety
  mechanism — it is what would silently orphan a candidate's history if the
  application-level check were removed.

Server actions catch both and return the message as `ActionState.error`;
`PublishControls` renders it. Surface the specific error — a generic "something
went wrong" on a publish that failed validation hides the one thing the editor
needs to know.

## The database rule

This app **never** imports `@bandzen/db/client`. It calls exported query
functions and nothing else. The raw Drizzle instance is a documented escape
hatch for that package's internals, not a surface for a consumer.

Everything the CMS needs already exists as a function. If you are reaching for
the client, the query belongs in `packages/db/src/queries.ts` where `apps/app`'s
isolation rule can see it — see `apps/app/README.md`, which owns the reasoning
about why the whole data surface sits in one reviewable file.

Answer keys stay in their own table (`question_answers`) rather than on
`questions`, so a careless `select *` cannot serialise an answer key into a
page. That holds here too.

## Where things live

```
src/app/(cms)/           the signed-in shell: layout, nav, nav-links
  page.tsx               Overview — counts and what changed lately
  passages/              list, new, [id] (+ inline questions), import
  writing-prompts/       list, new, [id]
  lessons/               list, new, [id] (+ the stage block editor)
  resources/             list, new, [id]
  teachers/              admin-only: grant and revoke a role
src/app/(auth)/          sign-in, outside the shell
src/app/forbidden.tsx    the 403 — see the denial rule above
src/components/          status-badge, publish-controls
src/lib/auth.ts          requireAdminOrTeacher / requireAdmin
```

`(cms)` and `(auth)` are route groups, so they change no URLs. The split exists
because a nested layout **cannot remove its parent's UI** — the sidebar had to
move out of the root layout, not be suppressed by `(auth)/layout.tsx`, or it
would follow the sign-in and 403 screens too.

The passage importer takes a **file upload** of one reviewed JSON file from
`apps/app/content/passages/` and creates a draft, rather than reading that
directory server-side: this is a separate deployment with no guaranteed
filesystem access to the other app. Its Zod schema in
`passages/import/schema.ts` mirrors `apps/app/src/lib/ai/schemas.ts` and says
so in a comment — that schema is not exported from a shared package, and one
narrow consumer did not justify a new package surface.

`writingPrompts.chartData` is deliberately absent from the CMS. Nothing renders
it, no Task 1 prompt uses it, and a form field for an unbuilt feature is a
promise the app cannot keep.

## Design system

Same design system as `apps/app`, differentiated by **three tokens**, not a
second visual language. `src/app/globals.css` imports `@bandzen/ui/globals.css`
and retargets:

```css
--plum: oklch(0.48 0.2 305); /* and a lifted ramp in .dark */
--primary: var(--plum); /* + --ring, --sidebar-primary, --sidebar-ring */
--tick: var(--plum); /* the wordmark's underline */
```

Everything else — the neutrals, the type scale, `--radius: 0.25rem`, the
primitives — comes from the shared package untouched. `--chrome` therefore has
exactly one job in this app: **marking a draft.** That is why the wordmark's
tick is plum here and gold in `apps/app`; leaving it gold would have spent the
one colour that now means something on decoration.

Two things about those overrides:

- **They are declared in `:root` _and_ `.dark`.** `@bandzen/ui`'s own `.dark`
  block sets `--primary: var(--cobalt)`, and `.dark` and `:root` have identical
  specificity — the `:root` mapping alone only wins on source order. Restating
  them under `.dark` is what makes it robust rather than lucky.
- **`--tick` is the token to reach for**, not `bg-chrome`. It defaults to
  `var(--chrome)` in the shared package, so `apps/app` and `apps/web` are
  unchanged by its existence.

`src/app/layout.tsx` loads Archivo, Inter and IBM Plex Mono exactly as
`apps/app` does, and **Archivo must stay the static cut** — `.font-title` sets
no `font-variation-settings` precisely because the product apps do not load the
`wdth` axis. Pull the variable face and you download bytes nothing renders.

Conventions inherited from `apps/app`, and worth restating because breaking
them is what makes a screen look untidy rather than broken:

- **Two type roles, and the split is the whole system.** `PageHeader` /
  `SectionHeader` (Archivo, sentence case) name a screen or a section.
  `Eyebrow` (mono, uppercase, tracked) labels instrumentation — a content
  count, a role, a slug, a timestamp. Reach for the primitive in
  `@bandzen/ui/components/primitives`, not a class string. When everything is
  an eyebrow, nothing is.
- **Lists beat cards.** `divide-y divide-border border-y border-border` rows
  carry nearly every screen. The Overview's counts are `Metric`s, not four
  bordered boxes — a frame around a number adds no information.
- **`FeatureBlock` is not available here, on purpose.** It stayed in `apps/app`
  because it describes an exam surface: an inverted ground, at most one per
  page, carrying the band-scale tick idiom. The CMS has none of those.
- **Status is never colour alone.** `StatusBadge` pairs the word with the
  variant. On the one screen whose entire job is showing what students can and
  cannot see, this is not optional.

The shell is `@bandzen/ui`'s shadcn `Sidebar`, the same as `apps/app` — it is
`fixed inset-y-0 h-svh`, so its ground is the viewport's height on a short
route as well as a long one, and below `md` it becomes a Sheet.

**Unlike `apps/app`, this app has a header**, and only below `md`. That
divergence is deliberate on both counts. `apps/app` has none because its exam
screens are full-bleed `lg:h-svh` surfaces with their own `sticky top-0`, and
because a five-tab bottom bar reaches every one of its destinations. Neither
holds here: nothing in the CMS goes full-bleed, and the nav has six entries —
so `SidebarTrigger` opens the Sheet the component already ships, rather than a
second navigation being written to hold a tab count that changes with the
viewer's role.

Desktop toggling is the rail at the sidebar's edge, or Cmd/Ctrl+B.
