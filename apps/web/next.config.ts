import type { NextConfig } from 'next';

/**
 * The docs deployment, which /docs is proxied through to.
 *
 * Its own Vercel project's production origin, not a public URL — nobody is
 * meant to visit it directly, and docs.bandzen.com is deliberately never
 * assigned so there is one canonical address for every page.
 *
 * Read at build time, so changing it needs a web redeploy. It is a stable
 * project URL, so that effectively never happens — and a docs deploy does not
 * require one, because the origin stays the same.
 */
const DOCS_ORIGIN =
  process.env.NEXT_PUBLIC_DOCS_ORIGIN ?? 'https://bandzen-docs.vercel.app';

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * Multi-zone: /docs and everything under it is served by apps/docs, which
   * sets a matching `basePath: '/docs'` so its assets resolve here too. Two
   * rules because `/docs/:path*` alone does not match the bare `/docs`.
   *
   * The zone is a separate deployment, so it ships on its own version bump and
   * this app does not rebuild when the documentation changes.
   */
  async rewrites() {
    return [
      { source: '/docs', destination: `${DOCS_ORIGIN}/docs` },
      { source: '/docs/:path*', destination: `${DOCS_ORIGIN}/docs/:path*` },
    ];
  },
};

export default nextConfig;
