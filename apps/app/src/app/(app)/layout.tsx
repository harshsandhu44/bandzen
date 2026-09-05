import Link from 'next/link';
import { cookies } from 'next/headers';
import { currentUser } from '@clerk/nextjs/server';
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
import { Toaster } from '@bandzen/ui/components/sonner';
import { requireUserId } from '@/lib/auth';
import { essayAllowance, getProfile, getSubscription } from '@/lib/db/queries';
import {
  PLANS,
  daysLeft,
  formatInr,
  isFoundingActive,
  isProAt,
  priceOf,
} from '@/lib/entitlements';
import { foundingEndsAt } from '@/lib/razorpay';
import { daysUntil } from '@/lib/dates';
import { MobileNav } from './mobile-nav';
import { Nav } from './nav';
import { TopBar } from './top-bar';

const FOUNDING_DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

/**
 * The signed-in shell: the `@bandzen/ui` shadcn Sidebar for primary
 * navigation, a persistent `TopBar` for wayfinding and the account menu, and
 * `MobileNav` as the bottom tab bar below `md`.
 *
 * The sidebar is the shadcn Sidebar rather than a hand-rolled `<aside>` for two
 * reasons: it is `fixed inset-y-0 h-svh` so its ground is the viewport height
 * on every route (a flex-row aside stopped at the content height), and it is
 * `md:block` with `MobileNav` taking over below that rather than simply
 * vanishing as `hidden sm:flex` did.
 *
 * The `TopBar` carries the breadcrumb, the test-day countdown and marks-left,
 * the theme toggle and the account menu. On a phone it is the only route to
 * Settings, the theme and sign out — the sidebar is desktop-only and the five
 * bottom tabs are full. It hides itself on the exam runners, which are
 * full-bleed `sticky top-0` surfaces of their own.
 *
 * This calls `requireUserId()` to read the profile for the countdown, not as a
 * second gate: every page below still authenticates itself and every query
 * still takes a userId. See proxy.ts for why the gate lives at the resource.
 */
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const userId = await requireUserId();
  const [profile, subscription, quota, user, cookieStore] = await Promise.all([
    getProfile(userId),
    getSubscription(userId),
    essayAllowance(userId),
    currentUser(),
    cookies(),
  ]);
  const days = profile?.testDate
    ? daysUntil(profile.testDate, profile.timezone)
    : null;
  const testDays = days != null && days >= 0 ? days : null;

  const until = subscription?.currentPeriodEnd ?? null;
  const pro = isProAt(until);
  const foundingEnds = foundingEndsAt();
  const founding = isFoundingActive(foundingEnds);

  // Trial and paid Pro are the same `isProAt()` boolean everywhere else on
  // purpose — entitlement doesn't care how the date got there. Only the shell
  // needs to tell them apart, so a trialing candidate sees a countdown instead
  // of the upsell going silent for a week and then cutting off with no warning.
  const trialDaysLeft =
    pro && subscription?.planId === 'trial' && until ? daysLeft(until) : null;

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

        <SidebarFooter className="p-4">
          {trialDaysLeft != null ? (
            <Link
              href="/upgrade?from=sidebar"
              className="block border border-chrome/40 px-3 py-2.5 transition-colors hover:border-chrome"
            >
              <p className="font-mono text-[0.625rem] tracking-[0.16em] text-chrome uppercase">
                Trial · {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'}{' '}
                left
              </p>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                Keep unlimited marking and Coach after it ends.
              </p>
            </Link>
          ) : pro ? null : (
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
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <TopBar
          email={user?.primaryEmailAddress?.emailAddress ?? null}
          testDays={testDays}
          essaysLeft={quota.unlimited ? null : quota.remaining}
          trialDaysLeft={trialDaysLeft}
        />

        {/* `p-6 sm:p-10` is load-bearing: the exam screens cancel exactly these
            with `-m-6 sm:-m-10` to go full-bleed. The extra bottom padding
            survives that cancellation, which is what clears the mobile bar. */}
        <div className="flex-1 p-6 pb-24 sm:p-10 sm:pb-24 md:pb-10">
          {children}
        </div>

        <MobileNav />
      </SidebarInset>

      <Toaster position="bottom-center" />
    </SidebarProvider>
  );
}
