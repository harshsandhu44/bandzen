'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment } from 'react';
import { useClerk } from '@clerk/nextjs';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@bandzen/ui/components/dropdown-menu';
import { ThemeToggle } from '@bandzen/ui/components/theme-toggle';
import { cn } from '@bandzen/ui/lib/utils';
import { EXAM_RUNNER } from './exam-route';
import { DOCS_URL } from './nav-links';

/**
 * The one persistent header. Breadcrumb on the left, the two figures a
 * candidate keeps half an eye on (test-day countdown, marks left) plus theme
 * and the account menu on the right.
 *
 * It renders on every breakpoint — on a phone it is also the only route to
 * Settings, the theme and sign out, since the sidebar is desktop-only and the
 * five bottom tabs are full.
 *
 * The exam runners are the exception: they are `-m-6 sm:-m-10` full-bleed
 * surfaces with their own `sticky top-0` chrome, and a second sticky bar above
 * would fight for the same offset. On those routes this renders nothing.
 */

type Section = { label: string; segment: string };

const KNOWN: Record<string, string> = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
  practice: 'Practice',
  progress: 'Progress',
  learn: 'Learn',
  resources: 'Guides',
  coach: 'Coach',
  settings: 'Settings',
  upgrade: 'Bandzen Pro',
  diagnostic: 'Diagnostic',
  onboarding: 'Get started',
  review: 'Review',
  report: 'Report',
  result: 'Result',
};

const PRACTICE_CHILD = new Set([
  'reading',
  'writing',
  'listening',
  'speaking',
  'diagnostic',
]);

function crumbsFor(pathname: string): { label: string; href?: string }[] {
  if (pathname === '/') return [{ label: 'Today' }];

  const segments = pathname.split('/').filter(Boolean);
  const known: Section[] = segments
    .map((segment) => ({ label: KNOWN[segment] ?? '', segment }))
    .filter((s): s is Section => s.label !== '');

  const crumbs = known.map((s, i) => {
    const upto = pathname.slice(
      0,
      pathname.indexOf(s.segment) + s.segment.length,
    );
    return { label: s.label, href: i < known.length - 1 ? upto : undefined };
  });

  // A module page hangs off Practice, which is not in its own URL.
  if (PRACTICE_CHILD.has(segments[0]!)) {
    crumbs.unshift({ label: 'Practice', href: '/practice' });
  }

  return crumbs.length ? crumbs : [{ label: 'Today' }];
}

export function TopBar({
  email,
  testDays,
  essaysLeft,
}: {
  email: string | null;
  testDays: number | null;
  /** Marks left this week, or null when unlimited. */
  essaysLeft: number | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();

  if (EXAM_RUNNER.test(pathname)) return null;

  const crumbs = crumbsFor(pathname);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-xs">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            return (
              <Fragment key={i}>
                {i > 0 ? (
                  <li aria-hidden className="text-muted-foreground/50">
                    /
                  </li>
                ) : null}
                <li className="truncate">
                  {crumb.href && !last ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={last ? 'font-medium' : 'text-muted-foreground'}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            );
          })}
        </ol>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        {testDays != null ? (
          <span
            className={cn(
              'font-mono text-[0.625rem] tracking-[0.14em] whitespace-nowrap uppercase',
              testDays <= 14 ? 'text-chrome' : 'text-muted-foreground',
            )}
          >
            <span className="hidden sm:inline">
              {testDays === 0
                ? 'Test today'
                : `Test in ${testDays} ${testDays === 1 ? 'day' : 'days'}`}
            </span>
            <span className="sm:hidden">
              {testDays === 0 ? 'Today' : `${testDays}d`}
            </span>
          </span>
        ) : null}

        {essaysLeft != null ? (
          <Link
            href="/upgrade?from=topbar"
            className="hidden font-mono text-[0.625rem] tracking-[0.14em] whitespace-nowrap text-muted-foreground uppercase underline-offset-4 hover:text-foreground hover:underline sm:inline"
          >
            {essaysLeft} {essaysLeft === 1 ? 'essay' : 'essays'} left
          </Link>
        ) : null}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1 border border-border px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label="Account"
          >
            <span
              aria-hidden
              className="grid size-5 place-items-center bg-primary text-[0.625rem] font-semibold text-primary-foreground"
            >
              {(email?.[0] ?? '?').toUpperCase()}
            </span>
            <ChevronDown className="size-3" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-52">
            {email ? (
              <p className="truncate px-2 pt-1.5 pb-2 font-mono text-[0.6875rem] text-muted-foreground">
                {email}
              </p>
            ) : null}
            <DropdownMenuItem render={<Link href="/settings" />}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a href={DOCS_URL} target="_blank" rel="noreferrer noopener" />
              }
            >
              Documentation
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut(() => router.push('/'))}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
