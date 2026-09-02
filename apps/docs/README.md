# docs

The user-facing documentation (port 3001). Its own Vercel project with root
directory `apps/docs`, but **served at `bandzen.com/docs`** — `apps/web`
rewrites `/docs` and `/docs/*` here, and `basePath: '/docs'` in `next.config.ts`
is what makes the assets resolve under the apex. It is signed-out, indexable,
and the only surface besides `apps/web` that is.

`docs.bandzen.com` is deliberately never assigned. Serving from the apex is the
whole point: these pages rank as part of `bandzen.com` instead of as a separate
site with no authority of its own.

Two things follow from `basePath` that are easy to get wrong. **This
deployment's own root 404s** — the docs preview serves at `<preview-url>/docs`.
And **`basePath` does not reach metadata**: it prefixes every `<Link>` and
asset, but not `metadataBase`, the social image, or the URLs `sitemap.ts`
emits. `NEXT_PUBLIC_DOCS_URL` therefore carries the `/docs` itself; drop it and
the social image resolves to `bandzen.com/opengraph-image`, which is web's zone
and a 404.

There is no `robots.ts` here on purpose. It would be served at
`/docs/robots.txt`, which no crawler reads — `apps/web` owns the apex
`robots.txt` and lists this app's sitemap from it.

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
  candidates/*/page.mdx    16 pages
  teachers/*/page.mdx      7 pages
  reference/*/page.mdx     3 pages
src/content/nav.ts         the site, in order — sidebar, sitemap and search read it
src/content/facts.ts       every number the prose asserts
src/content/facts.test.ts  the drift check against apps/app
src/content/docs-index.ts  build-time parse of the .mdx sources
src/mdx-components.tsx     prose elements → design system
src/components/            sidebar nav, TOC, search, callout, ruler, tables
```

## Adding a page

1. Write `src/app/(docs)/<group>/<slug>/page.mdx`, exporting `metadata`.
2. Add it to `src/content/nav.ts`.

Both steps, in that order. The nav is what decides the site exists — a page
with no nav entry is unreachable, absent from the sitemap, and unsearchable.

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

They are copies. `apps/app` owns the originals and this app cannot import them:
apps are not packages, and promoting `entitlements.ts` into `packages/db` to
serve a docs site would be the tail wagging the dog. So `facts.test.ts` reads
`apps/app`'s real source **as text** and fails if a value here has drifted from
it — the same trick `apps/admin`'s `import/schemas.test.ts` uses against
`apps/app/content/`.

When it fails, `apps/app` is right and `facts.ts` is stale. Fix `facts.ts`,
then read the pages that cite the number.

**Prices are deliberately absent and should stay absent.** The root README is
explicit that they change without a commit, so a price written here would be
wrong before anyone noticed. `PRICING_URL` points at the marketing site, which
is where they are kept current.

## What the prose may not say

The product is honest about what it does not do, and these pages have to match
or they contradict the screens they describe:

- **Listening and Speaking do not work.** No audio, no transcription, no
  content. They appear in the product as locked states saying so.
- **There is no four-skill mock test**, because two of the four skills do not
  exist to mock.
- **Every band is an estimate**, never an IELTS score, and nothing is projected.
- **General Training reading** is currently converted on the Academic scale.

The `locked` callout tone exists for the first two. It is muted and dashed and
is never a call to action — the same mark `apps/app` uses for things no amount
of money opens. See `src/components/callout.tsx`.

## Theme

`src/app/globals.css` imports the shared theme and overrides nothing.

This app used to override `--primary` to a green, to prove an app could retheme
`@bandzen/ui` without build tooling. `apps/admin` makes that point with its
plum, on a surface that has a reason to look different. Docs describes the
product, so a link here is the same cobalt as the button it is describing.

There is no `ThemeProvider`, so the site is light only. `@bandzen/ui`'s dark
tokens are all present — adding the provider and `<ThemeToggle />` is a two-line
change if it is ever wanted.
