import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Prices are per-visitor, the rest of the marketing site is not. This
  // inverts the default — data access is dynamic unless a `'use cache'` says
  // otherwise — so the pages stay prerendered shells with the price block
  // streamed into a hole, rather than the whole site going dynamic to localise
  // two numbers.
  cacheComponents: true,
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from this app; don't regenerate them.
  agentRules: false,
};

export default nextConfig;
