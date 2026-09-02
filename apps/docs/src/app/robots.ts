import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.bandzen.com';

/**
 * Docs is the one signed-out, indexable surface besides the marketing site.
 * apps/app and apps/admin are both `noindex` — this is not.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
