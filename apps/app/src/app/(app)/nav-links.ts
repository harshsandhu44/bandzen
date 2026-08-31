import {
  BookOpen,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
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
   * Extra path prefixes this link owns. The module engines keep their original
   * flat URLs, so /reading has to light up "Practice" rather than nothing.
   */
  owns?: readonly string[];
};

export type NavGroup = { heading: string; links: readonly NavLink[] };

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    heading: 'Home',
    links: [{ href: '/dashboard', label: 'Home', Icon: LayoutDashboard }],
  },
  {
    heading: 'Prepare',
    links: [
      { href: '/plan', label: 'Study Plan', Icon: CalendarRange },
      { href: '/learn', label: 'Learn', Icon: GraduationCap },
      {
        href: '/practice',
        label: 'Practice',
        Icon: BookOpen,
        owns: ['/reading', '/writing'],
      },
      {
        href: '/tests',
        label: 'Mock Tests',
        Icon: ClipboardList,
        owns: ['/diagnostic'],
      },
    ],
  },
  {
    heading: 'Improve',
    links: [
      { href: '/review', label: 'Review', Icon: LibraryBig },
      { href: '/coach', label: 'Bandzen Coach', Icon: MessageSquare },
      { href: '/progress', label: 'Progress', Icon: LineChart },
      { href: '/resources', label: 'Resources', Icon: BookOpen },
    ],
  },
];

export const SETTINGS_LINK: NavLink = {
  href: '/settings',
  label: 'Settings',
  Icon: Settings,
};

export const ALL_LINKS: readonly NavLink[] = [
  ...NAV_GROUPS.flatMap((g) => g.links),
  SETTINGS_LINK,
];

/** Whether a link owns the current path. Longest match wins, so /learn does
 *  not stay lit while the reader is on /learn/reading/skimming's sibling. */
export function isActive(link: NavLink, pathname: string) {
  const prefixes = [link.href, ...(link.owns ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
