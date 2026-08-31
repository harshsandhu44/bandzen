# bandzen

pnpm workspaces + Turborepo monorepo.

## Layout

```
apps/
  web/                 marketing site (port 3000)
  docs/                @bandzen/ui reference + integration test (port 3001)
  app/                 the product: Clerk + Neon + OpenAI (port 3002)
packages/
  ui/                  shared shadcn design system (@bandzen/ui)
  eslint-config/       shared ESLint configs (@bandzen/eslint-config)
  tsconfig/            shared TypeScript configs (@bandzen/tsconfig)
```

`apps/web` and `apps/app` deploy separately — a static marketing site on the
apex domain, the signed-in product on `app.bandzen.com`. The marketing CTAs
point at the product app through `NEXT_PUBLIC_APP_URL`.

**`apps/app` carries rules the other two do not**, including the one that keeps
one candidate's data away from another's. Read
[`apps/app/README.md`](apps/app/README.md) before touching it.

## Commands

Run everything from the repo root — Turborepo fans each task out across
packages in parallel and caches the results.

| Command          | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `pnpm dev`       | Every dev server (web :3000, docs :3001, app :3002) |
| `pnpm build`     | Builds every app                                    |
| `pnpm lint`      | Lints every app and package                         |
| `pnpm typecheck` | Type-checks every package                           |
| `pnpm test`      | Runs every package's tests                          |
| `pnpm format`    | Prettier across the whole repo                      |

`apps/app` also owns database and content commands (`db:migrate`,
`content:generate`, and the rest) — they are listed in its own README because
they only make sense there.

Install once at the root (`pnpm install`) — never inside an app. There is a
single lockfile and a single `node_modules` store for the whole workspace.

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
