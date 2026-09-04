# docs

The user-facing documentation (port 3001). Its own Vercel project with root
directory `apps/docs`, deployed to `docs.bandzen.com`. It is signed-out,
indexable, and the only surface besides `apps/web` that is.

Two audiences, and they share almost nothing: **candidates** preparing for
IELTS, and **teachers** writing the content they practise on. A "teacher" here
is a Clerk `publicMetadata.role` — a CMS author. There is no roster, no class
and no teacher↔student link anywhere in the schema, so `/teachers` is an
authoring guide rather than a classroom one.

**Stack:** Next.js · MDX (`@next/mdx`) · `@bandzen/ui`. No database, no auth,
no client-side data fetching.

Run it from the repo root with `pnpm dev`, or `pnpm --filter docs dev`.

## Where things live

```
src/app/(docs)/            the shell: sidebar, header, prose column, TOC rail
  page.tsx                 the front door
  candidates/**/page.mdx   21 pages, in 7 sections (Getting started, Today,
                            Learn, Practice, Progress, Coach, Account)
  teachers/*/page.mdx      7 pages, in 3 sections
  reference/*/page.mdx     3 pages, flat (no sections)
src/content/nav.ts         the site, in order — sidebar, sitemap and search read it
src/content/facts.ts       every number (and the module list) the prose asserts
src/content/facts.test.ts  the drift check against apps/app
src/content/docs-index.ts  build-time parse of the .mdx sources
src/mdx-components.tsx     prose elements → design system
src/components/            sidebar nav, TOC, search, callout, ruler, tables
```

## Adding a page

1. Write `src/app/(docs)/<group>/<section-or-slug>/page.mdx`, exporting
   `metadata`. The folder path is the URL, so a page under a section
   (`practice/listening`) nests one level deeper than one that isn't
   (`coach`).
2. Add it to a section in `src/content/nav.ts` — an existing one, or a new
   `{ title, pages }` in the group's `sections` array. Omit `title` only for a
   group whose pages should sit flat (that's what Reference does).

Both steps, in that order. The nav is what decides the site exists — a page
with no nav entry is unreachable, absent from the sitemap, and unsearchable.

Moving a page (changing its folder) needs a third step: add its old and new
path to `redirects()` in `next.config.ts`. Every URL this restructure moved is
already there — follow that pattern.

MDX files are page files (`pageExtensions` includes `mdx`), so the URL is the
folder path and typed routes work. There is no frontmatter: MDX has none, and
`export const metadata` is what Next reads anyway.

`Callout`, `Ruler`, `BandTable` and `AwardTable` are on the component map, so
they need no import inside a page.

### The MDX plugins are named as strings

`next.config.ts` passes `[['remark-gfm', {}]]`, not `[remarkGfm]`. Turbopack
serialises loader options to hand them to its Rust side, and a function is not
serialisable — importing the plugin fails the build with "does not have
serializable options".

### Do not write `{/* ... */}` comments in an `.mdx` file

Prettier formats these files as markdown and rewrites the `*` as emphasis,
turning the comment into `{/_ ... _/}`, which acorn then fails to parse. The
build breaks; `pnpm dev` does not, because it had already compiled the file.

Put the explanation in the component it is about, or here.

### Markdown tables cannot hold JSX

A `{list.map(...)}` after a table's delimiter row is parsed as a paragraph, not
as rows. Anything table-shaped and data-driven goes in
`src/components/tables.tsx` instead. Literal JSX in an `.mdx` file also skips
the component map in `mdx-components.tsx`, which is why those components repeat
the cell styling rather than inheriting it.

## Numbers, and why they cannot rot

Everything the prose asserts about quotas, awards, band conversion and
thresholds lives in `src/content/facts.ts` — never inline in a page.

Most of these are copies. `apps/app` owns the originals and this app cannot
import them: apps are not packages, and promoting `entitlements.ts` into
`packages/db` to serve a docs site would be the tail wagging the dog. So
`facts.test.ts` reads `apps/app`'s real source **as text** and fails if a value
here has drifted from it — the same trick `apps/admin`'s
`import/schemas.test.ts` uses against `apps/app/content/`. That drift check now
also covers **which modules exist**: `facts.test.ts` reads
`apps/app/src/lib/modules.ts` and fails if a module gains or loses its marking
engine, or gains a lock reason. This app shipped a day before Listening and
Speaking did, and nothing caught it — the module check exists so the next one
does.

The writing and speaking criteria are the one exception: they moved into
`@bandzen/ai`, a real package this app depends on, so `facts.ts` imports them
instead of copying them. Drift there is a type error, not a test failure.

When a test fails, `apps/app` is right and `facts.ts` is stale. Fix `facts.ts`,
then read the pages that cite the number or the module.

**Prices are deliberately absent and should stay absent.** The root README is
explicit that they change without a commit, so a price written here would be
wrong before anyone noticed. `PRICING_URL` points at the marketing site, which
is where they are kept current.

## What the prose may not say

The product is honest about what it does not do, and these pages have to match
or they contradict the screens they describe:

- **There is no single sitting that chains all four skills** into one mock
  test. `/practice` says so directly. Every individual module — Reading,
  Listening, Writing, Speaking — has a working engine; the diagnostic (one
  reading passage, one Task 2 essay) is the closest thing to a mock today.
- **Every band is an estimate**, never an IELTS score, and nothing is projected.
- **General Training reading** is currently converted on the Academic scale,
  and so is Listening.
- **The study plan reads only Reading and Writing bands.** Listening and
  Speaking are marked and shown on Progress, but do not yet change what the
  plan asks a candidate to do.

The `locked` callout tone now exists for one thing: the still-unbuilt
four-skill mock test. It is muted and dashed and is never a call to action —
the same mark `apps/app` uses for things no amount of money opens. See
`src/components/callout.tsx`.

## Theme

`src/app/globals.css` imports the shared theme and adds one token,
`--docs-accent` — used only for the active row in the sidebar and the active
heading in the table of contents. Everything else, including every link's
colour, is untouched: docs describes the product, so a link here is still the
same cobalt as the button it is describing, and `--chrome` still owns the
ruler's band-9 tick and the wordmark tick. `apps/admin` retargets its primary
to plum, on a surface that has a reason to look different; docs does not.

The app ships a `ThemeProvider` and a `<ThemeToggle />` in the header, wired
the same way as `apps/app` and `apps/admin` (`next-themes`, `attribute="class"`,
`defaultTheme="system"`).
