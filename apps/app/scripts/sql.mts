/**
 * The database connection every script in this directory shares.
 *
 * Each of these ran `neon(process.env.DATABASE_URL!)` itself, four of them
 * behind a hand-copied guard and five behind a bare `!`. One module, one guard.
 *
 * `idle_timeout` is what makes a one-shot script exit. postgres-js holds its
 * socket open and keeps the event loop alive with it, so a script that ends
 * without `sql.end()` simply hangs — and these have several exit paths each.
 * Closing after two idle seconds lets every one of them fall off the end the
 * way they did under neon's HTTP driver. A reconnect is transparent, so a long
 * pause for an OpenAI call in between queries costs nothing but the handshake.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('Missing DATABASE_URL. Try: node --env-file=.env.local ...');

export const sql = postgres(url, { idle_timeout: 2 });
