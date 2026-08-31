import type { NextConfig } from 'next';

/** The product app's own deployment, which /app is proxied through to. */
const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'https://bandzen-app.vercel.app';

const nextConfig: NextConfig = {
  reactCompiler: true,
  /**
   * Multi-zone: /app and everything under it is served by apps/app, which sets
   * a matching `basePath: '/app'` so its assets resolve here too. Two rules
   * because `/app/:path*` alone does not match the bare `/app`.
   */
  async rewrites() {
    return [
      { source: '/app', destination: `${APP_ORIGIN}/app` },
      { source: '/app/:path*', destination: `${APP_ORIGIN}/app/:path*` },
    ];
  },
};

export default nextConfig;
