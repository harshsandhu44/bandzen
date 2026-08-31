import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { requireUserId } from '@/lib/auth';
import { getProfile } from '@/lib/db/queries';
import { daysUntil } from '@/lib/dates';
import { MobileNav } from './mobile-nav';
import { Nav } from './nav';

/**
 * The signed-in shell. Server component — only Nav, MobileNav, ThemeToggle and
 * Clerk's sign-out button cross the client boundary.
 *
 * This calls `requireUserId()` because it reads the profile for the countdown,
 * not because it is a second gate: every page below still authenticates itself,
 * and every query still takes a userId. See proxy.ts for why the gate lives at
 * the resource rather than in middleware.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  const days = profile?.testDate ? daysUntil(profile.testDate) : null;

  return (
    <div className="flex min-h-full flex-col sm:flex-row">
      <aside className="hidden shrink-0 flex-col gap-6 border-border p-4 sm:flex sm:w-56 sm:border-r">
        <Link
          href="/dashboard"
          className="px-3 font-mono text-xs tracking-widest text-muted-foreground uppercase"
        >
          Bandzen
        </Link>

        <Nav />

        <div className="mt-auto space-y-4">
          {profile?.targetBand != null || days != null ? (
            <dl className="space-y-1 border-t border-border px-3 pt-4 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
              {profile?.targetBand != null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Target</dt>
                  <dd className="tabular-nums">
                    Band {profile.targetBand.toFixed(1)}
                  </dd>
                </div>
              ) : null}
              {days != null ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Test</dt>
                  <dd className="tabular-nums">
                    {days === 0 ? 'Today' : `${days} days`}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <SignOutButton>
              <Button type="button" variant="ghost" size="sm">
                Sign out
              </Button>
            </SignOutButton>
          </div>
        </div>
      </aside>

      {/* Bottom padding clears the fixed mobile bar so the last row is reachable. */}
      <main className="flex-1 p-6 pb-24 sm:p-10 sm:pb-10">{children}</main>

      <MobileNav />
    </div>
  );
}
