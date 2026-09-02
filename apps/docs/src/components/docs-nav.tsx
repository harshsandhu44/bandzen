'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Eyebrow } from '@bandzen/ui/components/primitives';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@bandzen/ui/components/sidebar';
import { cn } from '@bandzen/ui/lib/utils';

import { NAV } from '@/content/nav';

/**
 * The sidebar navigation.
 *
 * Sentence case in the body face, matching `apps/app`'s `nav.tsx` — a
 * destination is a word you read, not a reading you take. The group labels are
 * `Eyebrow`s because "For candidates" labels a section rather than naming one.
 *
 * The active marker is a chrome tick at the left edge: the same mark the logo
 * puts under band 9, reused to mean "you are here". It is a rule as well as a
 * fill, so it survives being seen without colour.
 */
export function DocsNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <>
      {NAV.map((group) => (
        <SidebarGroup key={group.title} className="gap-2">
          <Eyebrow as="h2" className="px-2">
            {group.title}
          </Eyebrow>

          <SidebarMenu className="gap-0.5">
            {group.pages.map((page) => {
              const active = pathname === page.href;
              return (
                <SidebarMenuItem key={page.href}>
                  <SidebarMenuButton
                    isActive={active}
                    // On a phone the nav is a sheet over the page, so it has to
                    // close itself once it has done its job.
                    onClick={() => setOpenMobile(false)}
                    className="text-sm"
                    render={
                      <Link
                        href={page.href}
                        aria-current={active ? 'page' : undefined}
                      />
                    }
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 w-0.5',
                        active ? 'bg-chrome' : 'bg-transparent',
                      )}
                    />
                    <span>{page.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}
