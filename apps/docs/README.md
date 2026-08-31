# docs

Living reference for `@bandzen/ui`. Every component on the page is imported
from the shared package — nothing is copied in — so this app doubles as the
integration test for the design system: if a change to `packages/ui` breaks a
component, it breaks here.

Run it from the repo root with `pnpm dev` (starts on
http://localhost:3001, alongside web on 3000 and app on 3002), or
`pnpm --filter docs dev`.

## Why it looks different from web

`src/app/globals.css` overrides exactly one token, `--primary`, after importing
the shared theme. That is deliberate: one green button is enough to prove
per-app token overrides work without forking any component. Everything else
stays in sync with `packages/ui`.

## Adding a component to the page

Install it into the shared package first, then import it here:

```bash
cd apps/docs
pnpm dlx shadcn@latest add <component>
```

Primitives land in `packages/ui/src/components`; import them as
`@bandzen/ui/components/<component>` and add a section to `src/app/page.tsx`.
