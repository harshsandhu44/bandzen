import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { requestPasswordReset } from '../actions';

export const metadata = { title: 'Reset your password' };

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<'/forgot-password'>) {
  const { sent } = await searchParams;

  // Always the same message, sent or not: whether an address has an account is
  // not something this page should be willing to tell a stranger.
  if (sent) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg">Check your email</h1>
        <p className="text-sm text-muted-foreground text-pretty">
          If that address has a Bandzen account, a link to set a new password is
          on its way. It expires in an hour.
        </p>
        <p className="text-sm">
          <Link href="/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg">Reset your password</h1>
      <p className="text-sm text-muted-foreground text-pretty">
        We will email you a link to set a new one.
      </p>
      <AuthForm
        action={requestPasswordReset}
        submitLabel="Send the link"
        pendingLabel="Sending…"
        fields={[
          {
            name: 'email',
            label: 'Email',
            type: 'email',
            autoComplete: 'email',
          },
        ]}
      >
        <p className="text-sm">
          <Link href="/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </AuthForm>
    </div>
  );
}
