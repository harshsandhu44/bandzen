import type { MetadataRoute } from 'next';

/**
 * The product app. `start_url` is the dashboard, and the app is noindex, so
 * this exists for the install prompt and the Android address-bar tint rather
 * than for discovery.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bandzen',
    short_name: 'Bandzen',
    description: 'Practice, mock tests and AI analysis for IELTS.',
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
