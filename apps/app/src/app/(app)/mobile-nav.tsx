'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  ClipboardList,
  Ellipsis,
  GraduationCap,
  LayoutDashboard,
  X,
} from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@bandzen/ui/components/sheet';
import { cn } from '@bandzen/ui/lib/utils';
import { isActive, NAV_GROUPS, SETTINGS_LINK, type NavLink } from './nav-links';

/**
 * The phone navigation.
 *
 * Not the sidebar made narrow. Five destinations sit in the thumb's reach at
 * the bottom of the screen, and the rest live behind More — chosen by what a
 * candidate opens mid-session, not by mirroring the desktop grouping.
 */

const PRIMARY = [
  { href: '/dashboard', label: 'Home', Icon: LayoutDashboard },
  { href: '/learn', label: 'Learn', Icon: GraduationCap },
  {
    href: '/practice',
    label: 'Practice',
    Icon: BookOpen,
    owns: ['/reading', '/writing'],
  },
  {
    href: '/tests',
    label: 'Tests',
    Icon: ClipboardList,
    owns: ['/diagnostic'],
  },
] as const satisfies readonly NavLink[];

const PRIMARY_HREFS = new Set<string>(PRIMARY.map((l) => l.href));

/** Everything not on the bar, in the sidebar's order. */
const MORE: readonly NavLink[] = [
  ...NAV_GROUPS.flatMap((g) => g.links).filter(
    (l) => !PRIMARY_HREFS.has(l.href),
  ),
  SETTINGS_LINK,
];

const ITEM =
  'flex flex-1 flex-col items-center gap-1 py-2 font-mono text-[0.5625rem] tracking-[0.14em] uppercase transition-colors';

export function MobileNav() {
  const pathname = usePathname();
  const moreActive = MORE.some((l) => isActive(l, pathname));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      {PRIMARY.map((link) => {
        const active = isActive(link, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              ITEM,
              active ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {/* The active marker is a rule, not just a colour change. */}
            <span
              aria-hidden
              className={cn(
                'h-px w-6',
                active ? 'bg-primary' : 'bg-transparent',
              )}
            />
            <link.Icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        );
      })}

      <Sheet>
        <SheetTrigger
          nativeButton
          className={cn(
            ITEM,
            moreActive ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'h-px w-6',
              moreActive ? 'bg-primary' : 'bg-transparent',
            )}
          />
          <Ellipsis className="size-4" aria-hidden />
          More
        </SheetTrigger>
        <SheetContent side="bottom" showCloseButton={false} className="p-0">
          <SheetTitle className="sr-only">More</SheetTitle>
          <SheetDescription className="sr-only">
            The rest of the Bandzen navigation
          </SheetDescription>

          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              More
            </p>
            <SheetClose
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Close">
                  <X />
                </Button>
              }
            />
          </div>

          {/* Without a minimum, the last row sits flush against the bottom
              edge on any browser that reports no safe-area inset. */}
          <ul className="divide-y divide-border pb-[max(env(safe-area-inset-bottom),0.5rem)]">
            {MORE.map((link) => (
              <li key={link.href}>
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href={link.href}
                      aria-current={
                        isActive(link, pathname) ? 'page' : undefined
                      }
                      className="flex items-center gap-3 px-4 py-3.5 font-mono text-xs tracking-widest uppercase aria-[current]:bg-secondary"
                    >
                      <link.Icon
                        className="size-3.5 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      {link.label}
                    </Link>
                  }
                />
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
