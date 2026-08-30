import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

// Display. The width axis is what lets headlines go genuinely oversized
// without the letterforms turning into stretched noise.
const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  display: 'swap',
  axes: ['wdth'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

// Load-bearing, not decorative: every band score, timer, criterion label and
// section eyebrow is set in mono. It is what makes the product surfaces read
// as instrumentation.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Bandzen — Own your band.',
    template: '%s · Bandzen',
  },
  description:
    'Practice all four IELTS modules, take realistic mock tests, and understand exactly what is holding your score back with detailed AI analysis.',
  applicationName: 'Bandzen',
  openGraph: {
    title: 'Bandzen — Own your band.',
    description:
      'AI-powered IELTS preparation. Practice every module, take full mock tests, and find out exactly why your score is stuck.',
    siteName: 'Bandzen',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bandzen — Own your band.',
    description:
      'AI-powered IELTS preparation. Practice every module, take full mock tests, and find out exactly why your score is stuck.',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-100 focus-visible:bg-cobalt focus-visible:px-4 focus-visible:py-2 focus-visible:font-mono focus-visible:text-xs focus-visible:tracking-widest focus-visible:text-paper focus-visible:uppercase"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
