import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import './globals.css';

/**
 * The same three families as apps/app, loaded the same way, because the CMS
 * uses the same primitives from @bandzen/ui and they are set in these faces.
 *
 * Archivo WITHOUT the `wdth` axis, deliberately. `.font-title` in the shared
 * stylesheet sets no font-variation-settings precisely because the product
 * apps load the static cut — pulling the variable-width payload here would
 * download bytes nothing renders.
 */
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

// Load-bearing, not decorative: every eyebrow, content count and timestamp.
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
  title: { default: 'Bandzen CMS', template: '%s · Bandzen CMS' },
  robots: { index: false, follow: false },
};

/**
 * Deliberately bare — html/body/providers only, same split as apps/app.
 * The CMS sidebar lives in `(cms)/layout.tsx` so that `(auth)/sign-in` and the
 * root `forbidden.tsx` can render without it: a nested layout cannot remove
 * its parent's UI, so chrome placed here would follow every route.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
