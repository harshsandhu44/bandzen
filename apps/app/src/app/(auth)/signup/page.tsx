import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { GoogleButton } from '@/components/auth/google-button';
import { signUp } from '../actions';

export const metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <>
      <p className="mb-4 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Beta
      </p>

      <GoogleButton />

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating…"
        fields={[
          {
            name: 'firstName',
            label: 'First name',
            type: 'text',
            autoComplete: 'given-name',
            optional: true,
          },
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
            autoComplete: 'new-password',
            hint: 'At least 8 characters.',
          },
        ]}
      >
        <p className="text-sm">
          <Link href="/sign-in" className="underline underline-offset-4">
            Already have an account?
          </Link>
        </p>
      </AuthForm>
    </>
  );
}
