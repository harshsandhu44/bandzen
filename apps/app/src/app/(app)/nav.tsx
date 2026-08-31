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
import { isActive, NAV_LINKS, SETTINGS_LINK, type NavLink } from './nav-links';

/**
 * The sidebar navigation.
 *
 * Sentence case, in the body face. Mono uppercase is reserved for
 * instrumentation -- a destination is a word you read, not a reading you take.
 */

function Item({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        // On a phone the nav is a sheet over the page, so it has to close
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

export function Nav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-0.5 px-2">
      {NAV_LINKS.map((link) => (
        <Item key={link.href} link={link} pathname={pathname} />
      ))}

      <SidebarSeparator className="my-2" />

      <Item link={SETTINGS_LINK} pathname={pathname} />
    </SidebarMenu>
  );
}
