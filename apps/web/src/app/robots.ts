import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bandzen.com';

/**
 * The apex owns robots.txt for both zones.
 *
 * apps/docs is served at /docs through a rewrite and sets a matching basePath,
 * so anything it generated would land at /docs/robots.txt — a path no crawler
 * looks at. Its sitemap is listed here instead.
 *
 * apps/app and apps/admin are `noindex` at the page level and are on their own
 * origins, so neither needs a rule here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: [`${BASE}/sitemap.xml`, `${BASE}/docs/sitemap.xml`],
  };
}
