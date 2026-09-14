/**
 * Lazy OpenAI client singleton. Not `server-only` — the offline generation
 * scripts and `node --test` import this package too; the app layer re-adds
 * that guard where it matters.
 */
import OpenAI from 'openai';

let client: OpenAI | undefined;

export function openai() {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      throw new Error('Missing environment variable: OPENAI_API_KEY');
    // Centralised so no call site has to remember one. The graders run inside
    // `after()` where a hung request would hold the function open with nothing
    // watching; 60s is well past the slowest measured grade (~9s p50) and well
    // inside Vercel's own ceiling.
    client = new OpenAI({ apiKey, timeout: 60_000 });
  }
  return client;
}
