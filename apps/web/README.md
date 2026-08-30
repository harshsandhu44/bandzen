# web

Next.js 16 (App Router, React 19, React Compiler, Tailwind v4).

Run it from the repo root — `pnpm dev` starts this app on
http://localhost:3000. `pnpm --filter web <script>` targets it directly.

| Script      |                                                              |
| ----------- | ------------------------------------------------------------ |
| `dev`       | Next dev server                                              |
| `build`     | Production build                                             |
| `start`     | Serves the production build                                  |
| `lint`      | ESLint (`eslint-config-next`, config in `eslint.config.mjs`) |
| `typecheck` | `next typegen && tsc --noEmit`                               |

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
