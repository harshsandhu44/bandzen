import 'server-only';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Missing environment variable: DATABASE_URL');

/**
 * Neon over HTTP: one round trip per statement, no connection pool to exhaust
 * from serverless functions, and it scales to zero with the database.
 *
 * Not exported beyond this directory. `queries.ts` is the only module that
 * imports it — see the note there.
 */
export const db = drizzle(neon(url), { schema });
