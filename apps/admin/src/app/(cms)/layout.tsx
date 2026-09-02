import { cookies } from 'next/headers';
import { SignOutButton } from '@clerk/nextjs';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow } from '@bandzen/ui/components/primitives';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@bandzen/ui/components/sidebar';
import { ThemeToggle } from '@bandzen/ui/components/theme-toggle';
import { Wordmark } from '@bandzen/ui/components/wordmark';
import { Version } from '@bandzen/ui/components/version';
import { requireAdminOrTeacher } from '@/lib/auth';
import { Nav } from './nav';
import pkg from '../../../package.json';

/**
 * The CMS shell.
 *
 * Same Sidebar as apps/app's signed-in shell, for the same two reasons: it is
 * `fixed inset-y-0 h-svh`, so its ground is the viewport's height on a short
 * route as well as a long one; and below `md` it becomes a Sheet rather than
 * disappearing.
 *
 * Unlike apps/app it has a header, and that divergence is deliberate. apps/app
 * has none because its exam screens are full-bleed `lg:h-svh` surfaces with
 * their own `sticky top-0`, so anything sticky above them fights for the same
 * offset — and because a bottom tab bar reaches every one of its five
 * destinations. Neither holds here: nothing in the CMS goes full-bleed, and the
 * nav has six entries, so `SidebarTrigger` in a slim header opens the Sheet the
 * component already ships instead of a second navigation being written.
 *
 * This calls `requireAdminOrTeacher()` for the role and the email the footer
 * shows, NOT as the gate. Next does not re-run layouts on client-side
 * navigation, so a layout must never be the only gate — every page below still
 * calls `requireAdminOrTeacher()` or `requireAdmin()` for itself.
 */
export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ role, email }, cookieStore] = await Promise.all([
    requireAdminOrTeacher(),
    cookies(),
  ]);

  // Read the sidebar's own cookie server-side so the first paint matches what
  // it was left as, rather than flashing open then collapsing.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-4 py-3">
          <Wordmark className="self-start" tag="CMS" collapse />
        </SidebarHeader>

        <SidebarContent>
          <Nav isAdmin={role === 'admin'} />
        </SidebarContent>

        <SidebarFooter className="gap-4 p-4">
          {/* Who you are, and what that lets you do. The role is the thing that
              decides whether you see this shell or the 403 page, and Clerk's
              UserButton never showed it. */}
          <div className="space-y-0.5 border-t border-sidebar-border pt-4">
            <Eyebrow>{role}</Eyebrow>
            {email ? (
              <p
                className="truncate text-xs text-muted-foreground"
                title={email}
              >
                {email}
              </p>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <SignOutButton>
              <Button type="button" variant="ghost" size="sm">
                Sign out
              </Button>
            </SignOutButton>
          </div>

          <Version value={pkg.version} className="self-start" />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* The only way to open the Sheet below `md`. Hidden from `md` up,
            where the rail and Cmd/Ctrl+B do the job and a header would be a
            band of empty space above every screen. */}
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background px-4 py-3 md:hidden">
          <SidebarTrigger />
          <Wordmark tag="CMS" />
        </header>

        <div className="flex-1 p-6 sm:p-10">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
