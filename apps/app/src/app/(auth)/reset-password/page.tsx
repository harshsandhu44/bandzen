import { AuthForm } from '@/components/auth/auth-form';
import { updatePassword } from '../actions';

export const metadata = { title: 'Set a new password' };

/**
 * Reached only through a recovery link, which the callback route has already
 * exchanged for a session. Someone who opens this URL cold has no session, and
 * `updateUser` fails — there is nothing here to guard separately.
 */
export default function ResetPasswordPage() {
  return (
    <AuthForm
      action={updatePassword}
      title="Set a new password"
      description="You'll be signed in once it's saved."
      submitLabel="Save and continue"
      pendingLabel="Saving…"
      fields={[
        {
          name: 'password',
          label: 'New password',
          type: 'password',
          autoComplete: 'new-password',
          hint: 'At least 8 characters.',
        },
      ]}
    />
  );
}
