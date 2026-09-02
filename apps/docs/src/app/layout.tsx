import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

// The same three families as apps/web, apps/app and apps/admin, and for the
// same reason: `@bandzen/ui` sets its headings in `--font-archivo`, its
// instrumentation in `--font-plex-mono`, and falls back to a system stack if an
// app fails to load them. Docs used to load Geist and got the fallback on every
// heading, which is why `Eyebrow` and `.font-title` looked identical here.
//
// Archivo WITHOUT the `wdth` axis. Only the marketing site's display type uses
// the variable width; loading it here downloads a payload nothing reads.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#09090f',
};

export const metadata: Metadata = {
  // The apex *including* `/docs`. basePath prefixes links and assets but not
  // metadata URLs, so without the path here `opengraph-image` resolves to
  // bandzen.com/opengraph-image, which is web's zone and a 404.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://bandzen.com/docs',
  ),
  title: { default: 'Bandzen docs', template: '%s · Bandzen docs' },
  description:
    'How to use Bandzen — for candidates preparing for IELTS, and for teachers writing the content.',
  applicationName: 'Bandzen docs',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
