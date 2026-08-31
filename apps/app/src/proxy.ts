import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Session hydration only — this deliberately does NOT gate routes.
 *
 * Clerk deprecated `createRouteMatcher` because middleware-based protection
 * relies on path matching, which can diverge from how Next actually routes a
 * request and leave a protected resource reachable. The gate therefore lives
 * at each resource instead: every page and server action that touches user
 * data calls `requireUserId()`.
 *
 * That is enforced structurally rather than by discipline — every function in
 * `src/lib/db/queries.ts` takes a userId, so a page that forgets to
 * authenticate has nothing it can query.
 */
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    // The dashboard. Listed on its own because the catch-all below is parsed by
    // path-to-regexp, whose segments must be non-empty -- it never matches '/',
    // and auth() then throws for want of a middleware.
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
    '/(api|trpc)(.*)',
  ],
};
