import type { MetadataRoute } from 'next';

import { ALL_PAGES } from '@/content/nav';

const BASE = process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.bandzen.com';

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
