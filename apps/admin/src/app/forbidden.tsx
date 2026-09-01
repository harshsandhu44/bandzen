import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow } from '@bandzen/ui/components/primitives';
import { Wordmark } from '@bandzen/ui/components/wordmark';

/**
 * Rendered by `forbidden()` in `src/lib/auth.ts` when a signed-in account has
 * no CMS role. It must not redirect: this app shares a Clerk instance with
 * apps/app (and on localhost the session cookie ignores the port), so a student
 * session is a valid session here. Sending them anywhere would put them back
 * through a gate — which is exactly the `/` → `/teachers` → `/` loop this
 * replaced.
 *
 * Sign out is the first action rather than a footnote, because for the case
 * this page actually exists to handle — the wrong account, not the wrong
 * person — it is the fix.
 */
export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <Wordmark href="/" tag="CMS" />

        <div className="space-y-3">
          <Eyebrow>403 · No access</Eyebrow>
          <h1 className="font-title text-title-lg">
            This account cannot edit content
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            You are signed in, but without a CMS role. If you are on the wrong
            account — the student app shares this sign-in — sign out and use the
            one that has access. Otherwise ask an admin for the teacher role.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SignOutButton>
            <Button type="button">Sign out</Button>
          </SignOutButton>
          <Button
            nativeButton={false}
            variant="ghost"
            render={<Link href="/" />}
          >
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
