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
  const message = typeof error === 'string' ? RETURN_ERRORS[error] : undefined;

  return (
    <>
      {message ? (
        <p role="alert" className="mb-6 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <GoogleButton />
      <AuthForm
        action={signIn}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        fields={[
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            autoComplete: 'email',
          },
          {
            name: 'password',
            label: 'Password',
            type: 'password',
            autoComplete: 'current-password',
          },
        ]}
      >
        <div className="flex justify-between text-sm">
          <Link href="/signup" className="underline underline-offset-4">
            Create an account
          </Link>
          <Link
            href="/forgot-password"
            className="text-muted-foreground underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>
      </AuthForm>
    </>
  );
}
