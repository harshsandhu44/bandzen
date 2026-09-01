import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `forbidden()` in src/lib/auth.ts — Next gates it behind this flag.
  experimental: { authInterrupts: true },
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  agentRules: false,
};

export default nextConfig;
