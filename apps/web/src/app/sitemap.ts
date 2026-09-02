import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bandzen.com';

/**
 * The marketing pages only. The documentation is a separate zone with its own
 * sitemap at /docs/sitemap.xml, listed from robots.txt alongside this one.
 *
 * Hand-written because there are six of them and they are not going to become
 * sixty. The docs sitemap is generated from its nav for the opposite reason.
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
