import { AuthForm } from '@/components/auth/auth-form';
import { GoogleButton } from '@/components/auth/google-button';
import { signIn } from '../actions';

export const metadata = { title: 'Sign in' };

/**
 * Sign in only. CMS accounts are ordinary Bandzen accounts that an admin has
 * granted a role to, so there is nothing to sign up for here.
 */
export default async function SignInPage({
  searchParams,
}: PageProps<'/sign-in'>) {
  const { error } = await searchParams;

  return (
    <>
      {error === 'oauth' ? (
        <p role="alert" className="mb-6 text-sm text-destructive">
          Google sign-in did not finish. Try again.
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
      />
    </>
  );
}
