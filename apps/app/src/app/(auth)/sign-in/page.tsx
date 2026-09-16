import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { signIn } from '../actions';

export const metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
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
  );
}
