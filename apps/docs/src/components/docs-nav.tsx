'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import { Eyebrow } from '@bandzen/ui/components/primitives';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@bandzen/ui/components/sidebar';
import { cn } from '@bandzen/ui/lib/utils';

import { NAV, type DocSection } from '@/content/nav';

/**
 * The sidebar navigation.
 *
 * Two levels: a group label (`For candidates`), then a section per product
 * destination (`Practice`, `Learn`, …). A titled section is a native
 * `<details open>` so it collapses with no JavaScript and is expanded before
 * hydration. A section with no title (Reference) renders its pages flat.
 *
 * Sentence case in the body face, matching `apps/app`'s `nav.tsx` — a
 * destination is a word you read, not a reading you take. Group and section
 * labels are `Eyebrow`s because they name a section rather than link to one.
 *
 * The active marker is a `--docs-accent` tick at the left edge: the same shape
 * the logo puts under band 9, in the one colour this app adds to the shared
 * theme, reused to mean "you are here". It is a rule as well as a fill, so it
 * survives being seen without colour.
 *
 * ponytail: every section starts expanded and the reader toggles freely;
 * navigating re-expands them (React re-applies `open`). "Open the active
 * section, collapse and keep the rest collapsed" would need a
 * useState<Set<string>> — not worth it for a nav this short.
 */
export function DocsNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const menu = (section: DocSection) => (
    <SidebarMenu className="gap-0.5">
      {section.pages.map((page) => {
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
                  active ? 'bg-docs-accent' : 'bg-transparent',
                )}
              />
              <span>{page.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <>
      {NAV.map((group) => (
        <SidebarGroup key={group.title} className="gap-2">
          <Eyebrow as="h2" className="px-2">
            {group.title}
          </Eyebrow>

          {group.sections.map((section, i) =>
            section.title ? (
              <details key={section.title} open className="group/section">
                <summary className="flex cursor-pointer list-none items-center gap-1 px-2 py-1 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    aria-hidden
                    className="size-3 shrink-0 transition-transform group-open/section:rotate-90"
                  />
                  {section.title}
                </summary>
                <div className="mt-1">{menu(section)}</div>
              </details>
            ) : (
              <div key={i}>{menu(section)}</div>
            ),
          )}
        </SidebarGroup>
      ))}
    </>
  );
}
