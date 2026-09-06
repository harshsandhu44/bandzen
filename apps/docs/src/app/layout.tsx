import type { Metadata, Viewport } from 'next';
import { fontClassName } from '@bandzen/ui/fonts';
import { ThemeProvider } from 'next-themes';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#09090f',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://docs.bandzen.com',
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
      suppressHydrationWarning
      className={`${fontClassName} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
