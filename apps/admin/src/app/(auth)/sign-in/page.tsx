import { AuthForm } from '@/components/auth/auth-form';
import { GoogleButton } from '@/components/auth/google-button';
import { signIn } from '../actions';

export const metadata = { title: 'Sign in' };

/**
 * Sign in only. CMS accounts are ordinary Bandzen accounts that an admin has
 * granted a role to, so there is nothing to sign up for here, and a forgotten
 * password is reset where the account lives: in the app.
 */
export default async function SignInPage({
  searchParams,
}: PageProps<'/sign-in'>) {
  const { error } = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002';

  return (
    <AuthForm
      action={signIn}
      title="Sign in to the CMS"
      description="Use the Bandzen account you were given a role on."
      notice={
        error === 'oauth'
          ? 'Google sign-in did not finish. Try again.'
          : undefined
      }
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
            <a
              href={`${appUrl}/forgot-password`}
              className="underline-offset-4 hover:underline"
            >
              Forgot your password?
            </a>
          ),
        },
      ]}
    >
      <GoogleButton />
    </AuthForm>
  );
}
