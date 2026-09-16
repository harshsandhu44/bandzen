import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refresh the session and hand the rotated cookies back to the browser.
 *
 * This is why middleware is no longer optional. Access tokens are short-lived,
 * and only a request that can still write cookies can rotate one — a server
 * component cannot. Without this, a candidate is signed out roughly every hour
 * mid-sitting.
 *
 * `getUser()` is not a spare call: it is what asks the auth server to verify
 * the token, and reading the session from the cookie alone would trust a value
 * the browser could have written.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}
