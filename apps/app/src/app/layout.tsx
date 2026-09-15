import type { Metadata, Viewport } from 'next';
import { fontClassName } from '@bandzen/ui/fonts';
import { ClerkThemeProvider } from '@bandzen/ui/components/clerk-provider';
import { ConsentProvider, CookieConsent } from '@bandzen/ui/components/consent';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const viewport: Viewport = {
  // --paper. The app defaults to light, so the address bar matches the page
  // for everyone who has not chosen otherwise.
  themeColor: '#ffffff',
};

export const metadata: Metadata = {
  title: { default: 'Bandzen', template: '%s · Bandzen' },
  description: 'Practice, mock tests and AI analysis for IELTS.',
  applicationName: 'Bandzen',
  // The product app is behind auth; keep it out of search results entirely.
  robots: { index: false, follow: false },
};

/**
 * `ThemeProvider` wraps Clerk, not the other way round: ClerkThemeProvider
 * reads the resolved theme to style Clerk's own card, so it has to sit below
 * the provider that supplies it. Clerk only needs to be above anything using
 * its hooks — wrapping `<html>` is a convention of its docs, not a
 * requirement.
 *
 * `defaultTheme` is light rather than system on purpose: the product is
 * designed light-first and dark is an opt-in, not a consequence of the
 * candidate's OS.
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
          <ClerkThemeProvider>
            <ConsentProvider>
              {children}
              {/* The cookie policy lives on the marketing site, not here. */}
              <CookieConsent
                policyHref={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bandzen.com'}/cookies`}
              />
            </ConsentProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
