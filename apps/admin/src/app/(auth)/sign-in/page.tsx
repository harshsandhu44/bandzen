import { AuthForm } from '@/components/auth/auth-form';
import { signIn } from '../actions';

export const metadata = { title: 'Sign in' };

/**
 * Sign in only. CMS accounts are ordinary Bandzen accounts that an admin has
 * granted a role to, so there is nothing to sign up for here.
 */
export default function SignInPage() {
  return (
    <AuthForm
      action={signIn}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          autoComplete: 'current-password',
        },
      ]}
    />
  );
}
