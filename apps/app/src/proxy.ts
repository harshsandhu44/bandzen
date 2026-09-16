import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

/**
 * Session refresh only — this deliberately does NOT gate routes.
 *
 * Middleware protection relies on path matching, which can diverge from how
 * Next actually routes a request and leave a protected resource reachable. The
 * gate therefore lives at each resource instead: every page and server action
 * that touches user data calls `requireUserId()`.
 *
 * That is enforced structurally rather than by discipline — every function in
 * `src/lib/db/queries.ts` takes a userId, so a page that forgets to
 * authenticate has nothing it can query.
 *
 * What this does do is rotate the access token, which only a request that can
 * still write cookies is able to do. See `lib/supabase/proxy.ts`.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // The dashboard. Listed on its own because the catch-all below is parsed by
    // path-to-regexp, whose segments must be non-empty -- it never matches '/'.
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
    '/(api|trpc)(.*)',
  ],
};
