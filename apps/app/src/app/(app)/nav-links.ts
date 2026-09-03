import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /**
   * Extra path prefixes this link owns. Two reasons a link needs these:
   * the module engines keep their original flat URLs, so /reading has to light
   * up "Practice" rather than nothing; and the routes folded into another page
   * still exist as redirects, so /review has to light up "Progress".
   */
  owns?: readonly string[];
};

/**
 * The whole navigation, in one flat list.
 *
 * Five destinations, one per job a candidate has: see today, read about it,
 * attempt it, look back, ask. Sitting a timed test is a kind of attempting, so
 * it lives under Practice rather than beside it -- /tests owned no content of
 * its own beyond the diagnostic.
 *
 * Five is also what a phone can hold, and `mobile-nav.tsx` renders exactly
 * this list as its tab bar: adding a sixth destination here costs a tab there.
 */
export const NAV_LINKS: readonly NavLink[] = [
  {
    href: '/',
    label: 'Today',
    Icon: LayoutDashboard,
    owns: ['/plan'],
  },
  { href: '/learn', label: 'Learn', Icon: GraduationCap, owns: ['/resources'] },
  {
    href: '/practice',
    label: 'Practice',
    Icon: BookOpen,
    owns: [
      '/reading',
      '/writing',
      '/listening',
      '/speaking',
      '/tests',
      '/diagnostic',
    ],
  },
  { href: '/progress', label: 'Progress', Icon: LineChart, owns: ['/review'] },
  { href: '/coach', label: 'Coach', Icon: MessageSquare },
];

/**
 * Settings, kept out of NAV_LINKS on purpose.
 *
 * The one destination people open rarely and deliberately. It sits below the
 * separator in the sidebar, and on a phone -- where there are only five tabs --
 * behind the gear on Today rather than spending one.
 */
export const SETTINGS_LINK: NavLink = {
  href: '/settings',
  label: 'Settings',
  Icon: Settings,
};

export const ALL_LINKS: readonly NavLink[] = [...NAV_LINKS, SETTINGS_LINK];

/** Whether a link owns the current path. Longest match wins, so /learn does
 *  not stay lit while the reader is on /learn/reading/skimming's sibling. */
export function isActive(link: NavLink, pathname: string) {
  const prefixes = [link.href, ...(link.owns ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * The documentation site, on its own deployment.
 *
 * Not a sixth entry in NAV_LINKS: that list is rendered verbatim as the phone
 * tab bar, so five is the ceiling and a help link is not worth a tab.
 */
export const DOCS_URL =
  process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.bandzen.com';
