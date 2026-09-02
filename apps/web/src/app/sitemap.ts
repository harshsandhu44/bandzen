import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bandzen.com';

/**
 * The marketing pages.
 *
 * Hand-written, because there are six of them and they are not going to become
 * sixty. apps/docs generates its own from its nav for the opposite reason.
 *
 * The legal pages are here at a low priority rather than left out: they are
 * linked from every page's footer, so a crawler finds them regardless, and
 * saying so plainly costs three lines.
 */
const PAGES = [
  { path: '', priority: 1 },
  { path: '/about', priority: 0.6 },
  { path: '/contact', priority: 0.6 },
  { path: '/terms', priority: 0.3 },
  { path: '/privacy', priority: 0.3 },
  { path: '/refunds', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((page) => ({
    url: `${BASE}${page.path}`,
    changeFrequency: 'monthly' as const,
    priority: page.priority,
  }));
}
