import { clerkMiddleware } from '@clerk/nextjs/server';

/**
 * Session hydration only, same convention as apps/app: the gate lives at
 * each resource, not in middleware. Every page calls `requireAdminOrTeacher()`
 * or `requireAdmin()`.
 */
export const proxy = clerkMiddleware();

export const config = {
  matcher: [
    '/',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
    '/(api|trpc)(.*)',
  ],
};
