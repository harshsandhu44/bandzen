import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from apps/web; don't regenerate them here.
  agentRules: false,
};

export default nextConfig;
