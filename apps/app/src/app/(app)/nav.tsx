'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, PenLine, Stethoscope } from 'lucide-react';
import { cn } from '@bandzen/ui/lib/utils';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/reading', label: 'Reading', Icon: BookOpen },
  { href: '/writing', label: 'Writing', Icon: PenLine },
  { href: '/diagnostic', label: 'Diagnostic', Icon: Stethoscope },
] as const;

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 sm:flex-col" aria-label="Main">
      {LINKS.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 font-mono text-xs tracking-widest uppercase transition-colors',
              active
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
