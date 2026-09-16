import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Where every emailed link lands — confirmation and password recovery both.
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

  return NextResponse.redirect(new URL('/sign-in?error=link', origin));
}
