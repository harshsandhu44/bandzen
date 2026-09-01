import type { MetadataRoute } from 'next';

import { brand } from '@/content/sections';

/**
 * Android Chrome reads this for the install prompt and the address-bar tint.
 * `icon.svg` is listed as `any` (it scales) plus `maskable`, so Android can
 * crop it to whatever shape the launcher uses — safe here because the mark
 * sits inside an opaque tile with its own padding.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — ${brand.tagline}`,
    short_name: brand.name,
    description:
      'AI-powered IELTS preparation. Practice every module, take full mock tests, and find out exactly why your score is stuck.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090f',
    theme_color: '#09090f',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'maskable',
      },
      { src: '/apple-icon', type: 'image/png', sizes: '180x180' },
    ],
  };
}
