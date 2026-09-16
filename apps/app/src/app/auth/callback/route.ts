import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Where every emailed link and every Google sign-in lands.
 *
 * The link carries a one-time code, not a session. Exchanging it here, on a
 * route that can write cookies, is what turns it into one.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  // Only ever an in-app path: an absolute URL here would make this an open
  // redirect that any email could point anywhere.
  const next = searchParams.get('next');
  const to = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(to, origin));
  }

  // Google sends `error` (a cancelled consent, say) where it would have sent a
  // code; anything else without a working code is a spent or expired link.
  const reason = searchParams.has('error') ? 'oauth' : 'link';
  return NextResponse.redirect(new URL(`/sign-in?error=${reason}`, origin));
}
