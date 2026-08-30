import { SignUp } from '@clerk/nextjs';
import { RequestAccess } from '../../request-access';

export const metadata = { title: 'Create your account' };

/**
 * Clerk is in Restricted mode, so this only completes for someone holding an
 * invitation. Everyone else lands on the waitlist form below — that is the
 * landing page's "no code?" path.
 */
export default function SignUpPage() {
  return (
    <>
      <p className="mb-4 font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Closed beta
      </p>

      <SignUp />

      <hr className="my-8 border-border" />

      <h2 className="mb-2 text-sm font-medium">No invitation?</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Leave your email and we&rsquo;ll send one when a place opens up.
      </p>
      <RequestAccess />
    </>
  );
}
