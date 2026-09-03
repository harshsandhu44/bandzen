import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // `forbidden()` in src/lib/auth.ts — Next gates it behind this flag.
    authInterrupts: true,
    // A listening track's MP3 is uploaded through a server action; the
    // default 1 MB body cap would reject anything but the shortest clip.
    serverActions: { bodySizeLimit: '25mb' },
  },
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  agentRules: false,
};

export default nextConfig;
