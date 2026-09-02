import type { MetadataRoute } from 'next';

import { ALL_PAGES } from '@/content/nav';

// The apex plus `/docs`. `basePath` prefixes links and assets, not the URLs a
// sitemap emits, so this carries the zone's path itself.
const BASE = process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://bandzen.com/docs';

/** Built from the nav, so a page cannot be in the sitemap and unreachable. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: 'monthly', priority: 1 },
    ...ALL_PAGES.map((page) => ({
      url: `${BASE}${page.href}`,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
