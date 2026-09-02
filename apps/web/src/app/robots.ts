import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bandzen.com';

/**
 * This site only.
 *
 * The documentation is a separate deployment on its own origin and ships its
 * own robots.txt and sitemap; apps/app and apps/admin are `noindex` at the page
 * level. So there is nothing here to say about any of them — a sitemap on
 * another origin is listed from that origin's robots.txt, not from this one.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
