import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * This app is served at bandzen.vercel.app/app, rewritten from apps/web.
   *
   * basePath is what makes that work rather than just the rewrite: it prefixes
   * every asset URL and every `<Link>`, so /_next/* is requested under /app and
   * reaches this zone instead of 404ing against web's. It also moves the
   * Razorpay webhook to /app/api/razorpay -- register that path, not /api.
   */
  basePath: '/app',
  reactCompiler: true,
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from apps/web; don't regenerate them here.
  agentRules: false,
};

export default nextConfig;
