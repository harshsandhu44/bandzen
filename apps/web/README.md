# web

The marketing site. Next.js 16 (App Router, React 19, React Compiler,
Tailwind v4), deployed separately from the product app on the apex domain.

Run it from the repo root — `pnpm dev` starts this app on
http://localhost:3000. `pnpm --filter web <script>` targets it directly.

Every call to action points at `apps/app` through `NEXT_PUBLIC_APP_URL`
(`/signup`, `/diagnostic`, `/sign-in`), so the two deployments stay
independent. Copy lives in `src/content/sections.ts`, which carries its own
honesty rules — anything not yet real is marked `placeholder: true`, and the
IELTS non-affiliation disclaimer sits there too.

Note the site advertises all four modules. `apps/app` only has engines for
Reading and Writing, and shows honest locked states for the other two.

| Script      |                                                      |
| ----------- | ---------------------------------------------------- |
| `dev`       | Next dev server                                      |
| `build`     | Production build                                     |
| `start`     | Serves the production build                          |
| `lint`      | ESLint — rules live in `@bandzen/eslint-config/next` |
| `typecheck` | `next typegen && tsc --noEmit`                       |

`next typegen` has to run first: Next 16 generates `LayoutProps`/`PageProps`
into `.next/types`, so a bare `tsc` fails on a clean checkout.

## UI

Components and design tokens come from `@bandzen/ui` — don't copy shadcn
components into this app:

```tsx
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
```

`src/app/globals.css` imports the shared theme and is the place for
**web-only** token overrides. Anything redefined after the import wins:

```css
@import '@bandzen/ui/globals.css';

:root {
  --primary: oklch(0.55 0.2 265);
}
```

Changing a token for every app instead? Edit
`packages/ui/src/styles/globals.css`.

New shadcn components go in via `pnpm dlx shadcn@latest add <component>` run
from this directory — `components.json` routes primitives to `packages/ui`.
