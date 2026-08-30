import 'server-only';

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
