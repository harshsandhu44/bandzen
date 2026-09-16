import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { GoogleButton } from '@/components/auth/google-button';
import { signIn } from '../actions';

export const metadata = { title: 'Sign in' };

/** What `/auth/callback` and the Google action mean when they send people back here. */
const RETURN_ERRORS: Record<string, string> = {
  link: 'That link has expired or was already used. Sign in, or request a new one.',
  oauth: 'Google sign-in did not finish. Try again.',
};

export default async function SignInPage({
  searchParams,
}: PageProps<'/sign-in'>) {
  const { error } = await searchParams;

  return (
    <AuthForm
      action={signIn}
      title="Sign in to Bandzen"
      description="Pick up where you left off."
      notice={typeof error === 'string' ? RETURN_ERRORS[error] : undefined}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          autoComplete: 'current-password',
          aside: (
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          ),
        },
      ]}
    >
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        No account yet?{' '}
        <Link
          href="/signup"
          className="text-foreground underline underline-offset-4"
        >
          Create one
        </Link>
      </p>
    </AuthForm>
  );
}
