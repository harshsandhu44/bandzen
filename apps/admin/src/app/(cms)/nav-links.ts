import {
  BookOpen,
  FileText,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Library,
  Mic,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /**
   * Extra path prefixes this link owns, so a nested route keeps its parent lit.
   * /passages/new and /passages/import are Passages; /passages/[id] likewise.
   */
  owns?: readonly string[];
  /** Hidden from teachers. Only /teachers is admin-only; content CRUD is not. */
  adminOnly?: true;
};

/**
 * The whole navigation, in one flat list — same shape as apps/app's
 * nav-links.ts, minus the mobile tab-count ceiling. The CMS renders this list
 * into the sidebar only; below `md` the sidebar becomes a Sheet opened from the
 * header, so a sixth destination costs nothing here.
 *
 * Sentence case, in the body face. Mono uppercase is reserved for
 * instrumentation — a destination is a word you read, not a reading you take.
 */
export const NAV_LINKS: readonly NavLink[] = [
  { href: '/', label: 'Overview', Icon: LayoutDashboard },
  { href: '/passages', label: 'Passages', Icon: BookOpen },
  { href: '/listening', label: 'Listening', Icon: Headphones },
  { href: '/speaking', label: 'Speaking', Icon: Mic },
  { href: '/writing-prompts', label: 'Writing prompts', Icon: FileText },
  { href: '/lessons', label: 'Lessons', Icon: GraduationCap },
  { href: '/resources', label: 'Resources', Icon: Library },
];

/**
 * Kept out of NAV_LINKS for the same reason apps/app keeps Settings out: it is
 * the one destination opened rarely and deliberately, and it sits below the
 * separator. It is also the only admin-only screen — granting a role is the
 * one thing a teacher cannot do.
 */
export const TEACHERS_LINK: NavLink = {
  href: '/teachers',
  label: 'Teachers',
  Icon: Users,
  adminOnly: true,
};

/** Whether a link owns the current path. Longest match wins. */
export function isActive(link: NavLink, pathname: string) {
  const prefixes = [link.href, ...(link.owns ?? [])];
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
