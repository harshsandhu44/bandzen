import Link from 'next/link';

import { brand, footer } from '@/content/sections';

import { Container } from './section';
import { Wordmark } from './wordmark';

// lucide v1 removed its brand icons, and set as mono text these read better
// against the display type than a row of glyph buttons would.
const SOCIAL = ['Instagram', 'YouTube', 'LinkedIn', 'GitHub'] as const;

export function Footer() {
  return (
    <footer className="bg-ink text-paper border-paper/10 border-t">
      <Container className="py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Wordmark className="text-paper text-2xl" />
            <p className="font-display text-paper/70 mt-4 text-xl">
              {brand.tagline}
            </p>

            <ul className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2">
              {SOCIAL.map((label) => (
                <li key={label}>
                  <a
                    href="#main"
                    className="border-paper/20 hover:bg-paper hover:text-ink focus-visible:bg-paper focus-visible:text-ink block border px-3 py-1.5 font-mono text-[0.625rem] tracking-[0.16em] uppercase transition-colors focus-visible:outline-none"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-8">
            {footer.groups.map((group) => (
              <div key={group.title}>
                <h2 className="text-paper/70 font-mono text-[0.5625rem] tracking-[0.24em] uppercase">
                  {group.title}
                </h2>
                <ul className="mt-5 flex flex-col gap-3">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('#') ? (
                        <a
                          href={link.href}
                          className="text-paper/80 hover:text-paper focus-visible:text-chrome text-sm transition-colors focus-visible:outline-none"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-paper/80 hover:text-paper focus-visible:text-chrome text-sm transition-colors focus-visible:outline-none"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="border-paper/10 mt-16 flex flex-col gap-6 border-t pt-8 md:flex-row md:items-start md:justify-between">
          <p className="text-paper/70 max-w-2xl text-xs leading-relaxed">
            {brand.disclaimerShort}
          </p>
          <p className="text-paper/70 shrink-0 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
            © {new Date().getFullYear()} {brand.name}
          </p>
        </div>
      </Container>
    </footer>
  );
}
