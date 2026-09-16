import { Button } from '@bandzen/ui/components/button';
import { Separator } from '@bandzen/ui/components/separator';
import { signInWithGoogle } from '@/app/(auth)/actions';

/**
 * Whether the Supabase project has Google turned on, from Auth's public
 * settings endpoint. A local stack without Google credentials, or a project
 * whose provider was switched off, hides the button instead of showing one
 * that ends on an error page. Cached for five minutes: this changes when
 * someone edits the dashboard, not per request.
 */
async function googleEnabled() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        next: { revalidate: 300 },
      },
    );
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}

/**
 * login-02's "Or continue with" separator and the Google button. The separator
 * lives here rather than in the form, so a project without Google shows neither.
 */
export async function GoogleButton() {
  if (!(await googleEnabled())) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Separator className="flex-1" />
        Or continue with
        <Separator className="flex-1" />
      </div>
      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full gap-2">
          <GoogleMark />
          Continue with Google
        </Button>
      </form>
    </div>
  );
}

/** Google's "G", in its own colours, as its brand guidelines require. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.72-3.78H1.33v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.33a12 12 0 0 0 0 10.82l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A12 12 0 0 0 1.33 6.59l4.01 3.1A7.15 7.15 0 0 1 12 4.77Z"
      />
    </svg>
  );
}
