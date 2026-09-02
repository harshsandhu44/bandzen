# bandzen

pnpm workspaces + Turborepo monorepo.

## Layout

```
apps/
  web/                 marketing site (port 3000)
  docs/                @bandzen/ui reference + integration test (port 3001)
  app/                 the product: Clerk + Neon + OpenAI (port 3002)
  admin/               the CMS: content editing behind a role gate (port 3003)
packages/
  ui/                  shared shadcn design system (@bandzen/ui)
  db/                  schema, Neon client, shared queries (@bandzen/db)
  eslint-config/       shared ESLint configs (@bandzen/eslint-config)
  tsconfig/            shared TypeScript configs (@bandzen/tsconfig)
```

`apps/web`, `apps/app` and `apps/admin` deploy separately — a static marketing
site on the apex domain, the signed-in product on `app.bandzen.com`, and the
CMS on its own project. The marketing CTAs point at the product app through
`NEXT_PUBLIC_APP_URL`. `apps/admin` is a separate deployment but not a separate
system: it shares the product's Clerk instance and its Neon database, which is
why a signed-in student is a real session there and has to be turned away
rather than redirected.

**`apps/app` and `apps/admin` carry rules the others do not.** The product's
include the one that keeps one candidate's data away from another's; the CMS's
include why denial must terminate instead of redirecting, and why the content
status column defaults to `'published'`. Read
[`apps/app/README.md`](apps/app/README.md) and
[`apps/admin/README.md`](apps/admin/README.md) before touching either.

Pricing tiers, the access limits behind them, and the Razorpay build are
specified in [Pricing, tiers and access][pricing] in Notion. It lives there
rather than in this repo because it spans both deployments — the tier copy
lives in `apps/web`, everything it gates lives in `apps/app` — and because the
prices and the founding deadline change without a commit.

These READMEs are mirrored in Notion under [Bandzen — Engineering
Documentation][docs]. The files here stay the source of truth for anything
about the code.

[pricing]: https://www.notion.so/3cf5047e85f78107856fe3abd65b7c14
[docs]: https://www.notion.so/3cf5047e85f7818fbfc5fb8f8fd65808

## Commands

Run everything from the repo root — Turborepo fans each task out across
packages in parallel and caches the results.

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm dev`       | Every dev server (web :3000, docs :3001, app :3002, admin :3003) |
| `pnpm build`     | Builds every app                                                 |
| `pnpm lint`      | Lints every app and package                                      |
| `pnpm typecheck` | Type-checks every package                                        |
| `pnpm test`      | Runs every package's tests                                       |
| `pnpm format`    | Prettier across the whole repo                                   |

`apps/app` also owns database and content commands (`db:migrate`,
`content:generate`, and the rest) — they are listed in its own README because
they only make sense there. The schema itself lives in `packages/db`, but the
migrations and `drizzle.config.ts` stay with `apps/app`: one database, one
migration history, and the CMS is a reader of the schema rather than a second
author of it.

Install once at the root (`pnpm install`) — never inside an app. There is a
single lockfile and a single `node_modules` store for the whole workspace.

## Versioning and deploys

Every app owns its version in its own `package.json`, and bumping it is how a
change reaches production. Each app's `vercel.json` points Vercel's ignored
build step at [`scripts/deploy-if-bumped.sh`](scripts/deploy-if-bumped.sh),
which builds only when that app's version changed in the deployed commit. A
docs edit, a refactor or a rename lands on `main` and ships to nobody until
someone decides it should ship.

```bash
pnpm --filter app version minor --no-git-tag-version
```

`--no-git-tag-version` because four apps share one history — a tag reading
`v0.2.0` would not say of what. Bump in the same commit as the change rather
than after it: the gate compares one commit against its parent, so the bump
and the code it ships have to arrive together.

How much to bump is the prefix you are already writing in the commit message.
`feat` is a minor, `fix` is a patch, anything you would call breaking is a
major. `1.0.0` is a decision about the product, not about the code.

Previews are never gated. A pull request builds on every push, so the preview
URL stays current across review commits — none of which bump anything.

**The packages are deliberately unversioned**, and stay at `0.0.0`. A change
to `packages/ui` or `packages/db` therefore deploys nothing on its own: bump
each app that should carry it, in the same commit. Fixing a shared query and
forgetting to bump `apps/app` leaves the fix live nowhere, which is the one
way this rule bites.

Forgetting a bump is always a missing deploy rather than a wrong one. Redeploy
from the Vercel dashboard, or push the bump you meant to. The same is true of
the gate's one blind spot: it looks at the deployed commit against its parent,
so a bump buried inside a push of several commits is invisible.

Each app shows its version through `@bandzen/ui`'s `Version` — on Settings in
the product, at the foot of the CMS sidebar, in the marketing footer, and
under the title in docs. The app reads its own `package.json` in a server
component and passes the string down; importing that JSON inside a
`'use client'` subtree would inline the whole file, dependency list included,
into the browser bundle.

## Linting

`packages/eslint-config` ships two entry points. Each consumer's
`eslint.config.mjs` is a one-line re-export:

| Export                        | For               | Rules                                             |
| ----------------------------- | ----------------- | ------------------------------------------------- |
| `@bandzen/eslint-config/next` | Next.js apps      | `eslint-config-next` core-web-vitals + typescript |
| `@bandzen/eslint-config/base` | React/TS packages | `@eslint/js`, `typescript-eslint`, `react-hooks`  |

```js
// packages/ui/eslint.config.mjs
export { default } from '@bandzen/eslint-config/base';
```

Add a rule for everyone by editing the shared config; add one for a single
package by spreading the shared export and appending to it locally.

## Design system

`packages/ui` owns the shadcn components, the `cn` helper, and every design
token. Apps import from it:

```tsx
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
```

### Adding a component

Run the CLI from the app you're working in; it writes shared primitives into
`packages/ui` and app-specific blocks into the app:

```bash
cd apps/web
pnpm dlx shadcn@latest add dialog
```

Keep `style`, `baseColor`, and `iconLibrary` identical in
`apps/*/components.json` and `packages/ui/components.json`, or the CLI will
generate mismatched components.

Note the primitives are built on **Base UI**, not Radix — polymorphism is
`render={<Link />}` rather than `asChild`, and a `Button` rendering anything
other than a real `<button>` also needs `nativeButton={false}` or it claims
button semantics it does not have.

Not everything in `packages/ui` comes from the CLI. `band-scale` and
`band-trend` are hand-written server components that draw the 0–9 IELTS ruler,
and they are the whole data-visualisation surface — there is no chart library
in this repo, deliberately. Extend them rather than adding one.

### Overriding tokens for one app

`packages/ui/src/styles/globals.css` holds the shared theme. An app's
`src/app/globals.css` imports it and can redefine any token afterwards — later
declarations win, so no build tooling is involved:

```css
@import '@bandzen/ui/globals.css';

:root {
  --primary: oklch(0.45 0.11 165);
  --radius: 0.75rem;
}
```

Pick values that visibly differ from the shared theme. An override that
happens to match what `@bandzen/ui` already ships is indistinguishable from
no override at all.

Only override what differs. Everything left alone stays in sync with the
shared system — `apps/docs` does exactly this, which is why it renders the
same components in a different theme than `apps/web`.

## Adding an app

1. `pnpm create next-app@latest apps/<name>` (delete the lockfile,
   `pnpm-workspace.yaml`, `node_modules`, and `.gitignore` it generates — the
   root owns those).
2. Point its `tsconfig.json` at `@bandzen/tsconfig/nextjs.json`, and make its
   `eslint.config.mjs` a one-line
   `export { default } from '@bandzen/eslint-config/next';`.
3. Add `@bandzen/ui`, `@bandzen/tsconfig`, and `@bandzen/eslint-config` as
   `workspace:*` dependencies.
4. Give it `lint`, `build`, `dev`, `typecheck`, and `test` scripts so the root
   tasks pick it up.
5. Pass `--port` to its `dev` script — `pnpm dev` starts all apps at once and
   they will otherwise collide on 3000.
