import type { Metadata, Viewport } from 'next';
import { fontClassName } from '@bandzen/ui/fonts';
import { ConsentProvider, CookieConsent } from '@bandzen/ui/components/consent';
import { ClerkProvider } from '@clerk/nextjs';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#09090f',
};

export const metadata: Metadata = {
  title: { default: 'Bandzen', template: '%s · Bandzen' },
  description: 'Practice, mock tests and AI analysis for IELTS.',
  applicationName: 'Bandzen',
  // The product app is behind auth; keep it out of search results entirely.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        suppressHydrationWarning
        className={`${fontClassName} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ConsentProvider>
              {children}
              <CookieConsent />
            </ConsentProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
