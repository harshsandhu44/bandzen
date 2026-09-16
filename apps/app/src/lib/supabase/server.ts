import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * The Supabase client for server components, server actions and route handlers.
 *
 * Authentication only. Data goes through `@bandzen/db` over a direct Postgres
 * connection, and the tables are revoked from the `anon` and `authenticated`
 * roles precisely so this client cannot become a second, unaudited way into
 * them — see `drizzle/0029_supabase_auth_bridge.sql`.
 *
 * Built per request rather than hoisted to a module constant: it closes over
 * this request's cookies, and a shared instance would serve one visitor's
 * session to the next.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // A server component cannot write cookies. That is fine and
            // expected: proxy.ts refreshes the session on every request, so
            // the rotated token is already on its way to the browser.
          }
        },
      },
    },
  );
}
