import { existsSync } from 'node:fs';
import type { Config } from 'drizzle-kit';

// drizzle-kit runs as its own process, so it does not inherit Next's env
// loading. Node can read the file directly — no dotenv dependency needed.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

export default {
  schema: '../../packages/db/src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
