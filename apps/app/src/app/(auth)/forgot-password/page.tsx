import Link from 'next/link';
import { AuthForm } from '@/components/auth/auth-form';
import { requestPasswordReset } from '../actions';

export const metadata = { title: 'Reset your password' };

const backToSignIn = (
  <p className="text-center text-sm text-muted-foreground">
    <Link
      href="/sign-in"
      className="text-foreground underline underline-offset-4"
    >
      Back to sign in
    </Link>
  </p>
);

export default async function ForgotPasswordPage({
  searchParams,
}: PageProps<'/forgot-password'>) {
  const { sent } = await searchParams;

  // Always the same message, sent or not: whether an address has an account is
  // not something this page should be willing to tell a stranger.
  if (sent) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">
            Check your email
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            If that address has a Bandzen account, a link to set a new password
            is on its way. It expires in an hour.
          </p>
        </div>
        {backToSignIn}
      </div>
    );
  }

  return (
    <AuthForm
      action={requestPasswordReset}
      title="Reset your password"
      description="We'll email you a link to set a new one."
      submitLabel="Send the link"
      pendingLabel="Sending…"
      fields={[
        { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
      ]}
    >
      {backToSignIn}
    </AuthForm>
  );
}
