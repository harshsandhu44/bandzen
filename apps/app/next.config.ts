import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // `next dev` writes AGENTS.md and CLAUDE.md into the app root otherwise.
  // e33a0fe removed those from apps/web; don't regenerate them here.
  agentRules: false,
  experimental: {
    serverActions: {
      // Speaking posts its recording through `saveSpeakingRecording`, and the
      // 1 MB default is 32.7 seconds of the 16 kHz mono 16-bit WAV `wav.ts`
      // encodes (32,000 bytes/sec). The recording caps are 45s / 120s / 60s,
      // so Part 2 could never be saved at all: 120s is 3.66 MiB.
      //
      // 5mb clears the longest cap with room to spare. The real ceiling is
      // above us — Vercel caps a function's request body at 4.5 MB, which no
      // config here can raise — so a longer cap than today's 120s needs the
      // browser to PUT straight to R2 rather than a bigger number here.
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
