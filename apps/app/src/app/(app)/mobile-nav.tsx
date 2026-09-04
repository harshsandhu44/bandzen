'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@bandzen/ui/lib/utils';
import { EXAM_RUNNER } from './exam-route';
import { isActive, NAV_LINKS } from './nav-links';

/**
 * The phone navigation, and on a phone it is the only navigation.
 *
 * Every destination is a tab, so there is no drawer and nothing behind a
 * generic "More" label. A bottom bar and a drawer holding the same
 * destinations is the pattern to avoid — two ways to reach one place, and the
 * drawer is where things go to be forgotten.
 *
 * It renders NAV_LINKS directly rather than keeping its own list: five is what
 * fits in the thumb's reach at this width, and tying the two together means a
 * sixth destination cannot be added to the sidebar without someone noticing it
 * has nowhere to go here.
 *
 * Settings, the theme and sign out are reached from the top bar's account
 * menu, which is present on every breakpoint. The countdown is in the top bar
 * too. None of them spend a tab here.
 *
 * The breakpoint has to stay `md`, matching the sidebar's own MOBILE_BREAKPOINT
 * (768px). Split them and there is a window with two navs, or none.
 *
 * Hidden on the exam runners: mid-exam is not the moment to tab away, and the
 * runner puts its own navigator where this bar would sit.
 */

const ITEM =
  'flex flex-1 flex-col items-center gap-1 py-2 text-[0.625rem] transition-colors';

export function MobileNav() {
  const pathname = usePathname();

  if (EXAM_RUNNER.test(pathname)) return null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {NAV_LINKS.map((link) => {
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
    </nav>
  );
}
