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
    client = new OpenAI({ apiKey });
  }
  return client;
}
