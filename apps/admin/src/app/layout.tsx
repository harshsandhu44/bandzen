import type { Metadata, Viewport } from 'next';
import { fontClassName } from '@bandzen/ui/fonts';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import './globals.css';

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
        className={`${fontClassName} h-full antialiased`}
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
