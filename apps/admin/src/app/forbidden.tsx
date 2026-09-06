import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
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
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <Wordmark href="/" tag="CMS" />
      <p className="font-mono text-[0.6875rem] tracking-[0.22em] text-muted-foreground uppercase">
        Error 403 · No access
      </p>
      <p aria-hidden className="font-pixel text-7xl leading-none md:text-8xl">
        403
      </p>
      <h1 className="font-title max-w-2xl text-4xl text-balance">
        This account cannot edit content
      </h1>
      <p className="max-w-md text-sm text-muted-foreground text-balance">
        You are signed in, but without a CMS role. If you are on the wrong
        account — the student app shares this sign-in — sign out and use the one
        that has access. Otherwise ask an admin for the teacher role.
      </p>
      <div className="flex items-center gap-2">
        <SignOutButton>
          <Button
            type="button"
            size="xl"
            className="font-mono text-xs tracking-[0.14em] uppercase"
          >
            Sign out
          </Button>
        </SignOutButton>
        <Button
          nativeButton={false}
          variant="ghost"
          render={<Link href="/" />}
          size="xl"
          className="font-mono text-xs tracking-[0.14em] uppercase"
        >
          Try again
        </Button>
      </div>
    </main>
  );
}
