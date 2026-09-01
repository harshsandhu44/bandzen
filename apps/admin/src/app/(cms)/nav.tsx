'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@bandzen/ui/components/sidebar';
import { cn } from '@bandzen/ui/lib/utils';
import { isActive, NAV_LINKS, TEACHERS_LINK, type NavLink } from './nav-links';

function Item({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        // Below `md` the nav is a Sheet over the page, so it has to close
        // itself once it has done its job.
        onClick={() => setOpenMobile(false)}
        className="text-sm"
        render={
          <Link href={link.href} aria-current={active ? 'page' : undefined} />
        }
      >
        {/* The active marker is a rule as well as a fill, so it survives being
            seen without colour. */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-0.5',
            active ? 'bg-sidebar-primary' : 'bg-transparent',
          )}
        />
        <link.Icon aria-hidden />
        <span>{link.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * The sidebar navigation.
 *
 * `isAdmin` is resolved on the server in the layout and passed down rather than
 * read here: this is a client component, and a client-side role check would be
 * a suggestion, not a gate. The real gate is `requireAdmin()` inside
 * /teachers itself — hiding the link only stops a teacher clicking into a 403,
 * which is how the old redirect loop was reachable by hand.
 */
export function Nav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-0.5 px-2">
      {NAV_LINKS.map((link) => (
        <Item key={link.href} link={link} pathname={pathname} />
      ))}

      {isAdmin ? (
        <>
          <SidebarSeparator className="my-2" />
          <Item link={TEACHERS_LINK} pathname={pathname} />
        </>
      ) : null}
    </SidebarMenu>
  );
}
