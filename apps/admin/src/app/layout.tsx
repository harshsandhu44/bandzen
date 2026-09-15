import type { Metadata, Viewport } from 'next';
import { fontClassName } from '@bandzen/ui/fonts';
import { ClerkThemeProvider } from '@bandzen/ui/components/clerk-provider';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const viewport: Viewport = {
  // --paper. The CMS defaults to light, same as the product.
  themeColor: '#ffffff',
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
 *
 * `ThemeProvider` wraps Clerk because ClerkThemeProvider reads the resolved
 * theme — see apps/app's layout for the full note.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontClassName} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ClerkThemeProvider>{children}</ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
