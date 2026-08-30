# app

The Bandzen product app (port 3002). Deploys to `app.bandzen.com` as its own
Vercel project with root directory `apps/app`; `apps/web` stays a separate,
static deployment.

**Stack:** Clerk (auth) · Neon (Postgres) · Drizzle (schema, migrations, types)
· OpenAI (essay grading).

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
| `pnpm db:studio`        | Browse the database                            |
| `pnpm db:seed`          | Load `content/seed.sql`                        |
| `pnpm content:generate` | Generate reviewable passage JSON (costs money) |
| `pnpm content:sql`      | Build `content/seed.sql` from that JSON        |
| `pnpm test`             | Scoring and study-plan checks                  |

## Access model

Closed beta, so there is no billing and no quota logic — the Clerk invite list
is the cap. `src/proxy.ts` is the single gate; nothing re-checks auth in a
layout, because two places to get it right is one place to get it wrong.

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

## Design system

Tokens come entirely from `@bandzen/ui`. This app adds only an instrumentation
type scale in `src/app/globals.css`; the marketing display scale and the `bz-*`
scroll choreography stay in `apps/web`. Dark mode is wired here and only here —
`next-themes` with `attribute="class"`, driving the `.dark` block already
authored in `packages/ui`.
