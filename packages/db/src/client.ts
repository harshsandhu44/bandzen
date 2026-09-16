// Internal escape hatch. apps/app's own queries.ts may import this for
// entitlement/grading-coupled queries; nothing else should.
import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Missing environment variable: DATABASE_URL');

/**
 * Plain Postgres over TCP, which is all Supabase is from here — the auth client
 * is a separate concern in each app and never touches these tables.
 *
 * `prepare: false` because production connects through Supavisor in transaction
 * mode, where a prepared statement cannot be relied on to come back to the
 * session that made it. Local Postgres does not need it, but a driver that
 * behaves differently in the two places is a bug waiting for deploy day.
 *
 * Not exported beyond this directory. `queries.ts` is the only module that
 * imports it — see the note there.
 */
export const db = drizzle(postgres(url, { prepare: false }), { schema });
