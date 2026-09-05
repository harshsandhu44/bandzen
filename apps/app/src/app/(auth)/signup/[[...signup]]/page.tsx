import { SignUp } from '@clerk/nextjs';

export const metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <>
      <p className="mb-4 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Beta
      </p>

      <SignUp />
    </>
  );
}
