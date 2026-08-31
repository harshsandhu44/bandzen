'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@bandzen/ui/lib/utils';
import { isActive, NAV_GROUPS, SETTINGS_LINK, type NavLink } from './nav-links';

/**
 * The desktop sidebar navigation.
 *
 * Deliberately not collapsible. Persisting a collapsed state costs a client
 * provider and a cookie to save 14rem on screens wide enough not to need it,
 * and the sidebar is hidden outright below `sm` where the space matters.
 */

function Item({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-1.5 font-mono text-xs tracking-widest uppercase transition-colors',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <link.Icon className="size-3.5 shrink-0" aria-hidden />
      {link.label}
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading} className="flex flex-col gap-0.5">
          <p className="px-3 pb-1 font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground/70 uppercase">
            {group.heading}
          </p>
          {group.links.map((link) => (
            <Item key={link.href} link={link} pathname={pathname} />
          ))}
        </div>
      ))}
      <div className="flex flex-col gap-0.5">
        <Item link={SETTINGS_LINK} pathname={pathname} />
      </div>
    </nav>
  );
}
