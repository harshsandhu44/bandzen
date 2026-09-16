import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { GoogleButton } from '@/components/auth/google-button';
import { signUp } from '../actions';

export const metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <AuthForm
      action={signUp}
      title="Create your account"
      badge="Beta"
      description="Free to start. No card needed."
      submitLabel="Create account"
      pendingLabel="Creating…"
      fields={[
        {
          name: 'fullName',
          label: 'Full name',
          type: 'text',
          autoComplete: 'name',
        },
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          autoComplete: 'new-password',
          hint: 'At least 8 characters.',
        },
      ]}
    >
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/sign-in"
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </AuthForm>
  );
}
