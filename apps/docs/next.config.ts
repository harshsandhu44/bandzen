import createMDX from '@next/mdx';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pages are `.mdx` as often as `.tsx`. Every doc is a real route rather than
  // data behind a catch-all, which is what gives us typed routes and a
  // `metadata` export per page without a loader of our own.
  pageExtensions: ['ts', 'tsx', 'mdx'],
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from apps/web; don't regenerate them here.
  agentRules: false,
  // One entry per page the IA restructure moved. `permanent` (308) because
  // these are real moves, not a temporary reroute — search engines should
  // transfer ranking to the new URL. Every future slug change gets a line
  // here too.
  async redirects() {
    return [
      {
        source: '/candidates/reading-practice',
        destination: '/candidates/practice/reading',
        permanent: true,
      },
      {
        source: '/candidates/writing-and-marking',
        destination: '/candidates/practice/writing',
        permanent: true,
      },
      {
        source: '/candidates/how-reading-is-marked',
        destination: '/candidates/practice/how-reading-is-marked',
        permanent: true,
      },
      {
        source: '/candidates/your-writing-report',
        destination: '/candidates/practice/your-writing-report',
        permanent: true,
      },
      {
        source: '/candidates/lessons',
        destination: '/candidates/learn/lessons',
        permanent: true,
      },
      {
        source: '/candidates/guides',
        destination: '/candidates/learn/guides',
        permanent: true,
      },
      {
        source: '/candidates/awards-and-streaks',
        destination: '/candidates/progress/awards-and-streaks',
        permanent: true,
      },
    ];
  },
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
