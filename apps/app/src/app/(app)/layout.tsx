import Link from 'next/link';
import { cookies } from 'next/headers';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from '@bandzen/ui/components/sidebar';
import { Wordmark } from '@bandzen/ui/components/wordmark';
import { ThemeToggle } from '@bandzen/ui/components/theme-toggle';
import { requireUserId } from '@/lib/auth';
import { getProfile, proUntil } from '@/lib/db/queries';
import {
  PLANS,
  formatInr,
  isFoundingActive,
  isProAt,
  priceOf,
} from '@/lib/entitlements';
import { foundingEndsAt } from '@/lib/razorpay';
import { daysUntil } from '@/lib/dates';
import { MobileNav } from './mobile-nav';
import { Nav } from './nav';

const FOUNDING_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

/**
 * The signed-in shell.
 *
 * The sidebar is `@bandzen/ui`'s shadcn Sidebar rather than a hand-rolled
 * `<aside>`. Two things that bought us:
 *
 * - **Height.** The old aside sat in a flex row and so stretched only to the
 *   *content* height, which meant its ground stopped mid-page on a short route
 *   and ran long on `/progress`. Sidebar is `fixed inset-y-0 h-svh`, so it is
 *   the viewport's height on every route.
 * - **Mobile.** The old aside was `hidden sm:flex` — below `sm` it was simply
 *   gone. Sidebar is `md:block`, and below that `MobileNav` is the whole
 *   navigation rather than a fallback.
 *
 * On a phone the sidebar is not used at all: `MobileNav` renders every
 * destination as a tab, and nothing is lost by the sidebar's absence — the
 * countdown is already in Today's header, and the theme and sign out already
 * live on the Settings page. A bottom bar plus a drawer over the same
 * destinations would be two ways to reach one place.
 *
 * So there is no header, on any breakpoint. It only ever existed to hold a
 * drawer trigger, in the worst corner of a phone for a thumb to reach, and the
 * exam screens are `lg:h-svh` full-bleed surfaces with their own `sticky top-0`
 * header — anything sticky above them fights for the same offset.
 *
 * Desktop toggling is the rail at the sidebar's edge, or Cmd/Ctrl+B.
 *
 * This calls `requireUserId()` because it reads the profile for the countdown,
 * not because it is a second gate: every page below still authenticates itself,
 * and every query still takes a userId. See proxy.ts for why the gate lives at
 * the resource rather than in middleware.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const userId = await requireUserId();
  const [profile, until, cookieStore] = await Promise.all([
    getProfile(userId),
    proUntil(userId),
    cookies(),
  ]);
  const days = profile?.testDate
    ? daysUntil(profile.testDate, profile.timezone)
    : null;

  // The persistent entry point, and the only one that is always on screen.
  // Not a sixth nav item: NAV_LINKS is rendered verbatim as the phone tab bar,
  // so five is the ceiling. Not a banner either — that would be the header
  // this app deliberately does not have, and the exam screens cancel the
  // shell's padding to go full-bleed underneath one.
  const pro = isProAt(until);
  const foundingEnds = foundingEndsAt();
  const founding = isFoundingActive(foundingEnds);

  // Read the sidebar's own cookie server-side so the first paint matches what
  // the candidate left it as, rather than flashing open then collapsing.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-4 py-3">
          <Wordmark className="self-start" collapse />
        </SidebarHeader>

        <SidebarContent>
          <Nav />
        </SidebarContent>

        <SidebarFooter className="gap-4 p-4">
          {pro ? null : (
            <Link
              href="/upgrade?from=sidebar"
              className="block border border-chrome/40 px-3 py-2.5 transition-colors hover:border-chrome"
            >
              <p className="font-mono text-[0.625rem] tracking-[0.16em] text-chrome uppercase">
                {founding ? 'Founding price' : 'Bandzen Pro'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                {founding && foundingEnds
                  ? `${formatInr(priceOf(PLANS[0], true))} a month until ${FOUNDING_DATE.format(foundingEnds)}. Unlimited marking and Coach.`
                  : 'Unlimited essay marking and Coach.'}
              </p>
            </Link>
          )}

          {profile?.targetBand != null || days != null ? (
            <dl className="space-y-1 border-t border-sidebar-border pt-4 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
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
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* `p-6 sm:p-10` is load-bearing: the exam screens cancel exactly these
            with `-m-6 sm:-m-10` to go full-bleed. The extra bottom padding
            survives that cancellation, which is what clears the mobile bar. */}
        <div className="flex-1 p-6 pb-24 sm:p-10 sm:pb-24 md:pb-10">
          {children}
        </div>

        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
