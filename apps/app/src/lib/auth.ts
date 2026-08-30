import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * The user id every query is scoped by. proxy.ts already blocks unauthenticated
 * requests, so reaching the redirect here means something is misconfigured
 * rather than that a real visitor is signed out — but failing closed is the
 * only acceptable behaviour either way.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}
