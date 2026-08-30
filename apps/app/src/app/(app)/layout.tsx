import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Nav } from './nav';

/**
 * The signed-in shell. Server component — only Nav, ThemeToggle and Clerk's
 * sign-out button cross the client boundary.
 *
 * Auth is not checked here because this layout reads no user data. Each page
 * beneath it calls `requireUserId()` itself — see proxy.ts for why the gate
 * is at the resource rather than in middleware.
 */
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-col sm:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-border p-4 sm:w-56 sm:border-r">
        <Link
          href="/dashboard"
          className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
        >
          Bandzen
        </Link>

        <Nav />

        <div className="mt-auto flex items-center justify-between gap-2">
          <ThemeToggle />
          <SignOutButton>
            <Button type="button" variant="ghost" size="sm">
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  );
}
