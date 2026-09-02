import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * This site is served at bandzen.com/docs, rewritten from apps/web.
   *
   * basePath is what makes that work rather than the rewrite alone: it prefixes
   * every asset URL and every `<Link>`, so /_next/* is requested under /docs and
   * reaches this zone instead of 404ing against web's.
   *
   * It applies to this deployment's own URL too — the docs preview serves at
   * <preview>/docs, and its root 404s. That is expected.
   */
  basePath: '/docs',
  reactCompiler: true,
  // Pages are `.mdx` as often as `.tsx`. Every doc is a real route rather than
  // data behind a catch-all, which is what gives us typed routes and a
  // `metadata` export per page without a loader of our own.
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from apps/web; don't regenerate them here.
  agentRules: false,
};

const withMDX = createMDX({
  options: {
    // Named as strings, not imported. Turbopack serialises loader options to
    // pass them to its Rust side, and a function is not serialisable — passing
    // `[remarkGfm]` here fails the build with "does not have serializable
    // options". The string form is resolved inside the loader instead.
    //
    // gfm for tables: the band conversion table and the award catalogue are
    // both tables. slug for heading ids, which the on-page TOC anchors to.
    remarkPlugins: [['remark-gfm', {}]],
    rehypePlugins: [['rehype-slug', {}]],
  },
});

export default withMDX(nextConfig);
