import Link from 'next/link';

import { brand, footer } from '@/content/sections';

import { Container } from './section';
import { Wordmark } from './wordmark';

import { Version } from '@bandzen/ui/components/version';

import pkg from '../../../package.json';

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
                      <Link
                        href={link.href}
                        className="text-paper/80 hover:text-paper focus-visible:text-chrome text-sm transition-colors focus-visible:outline-none"
                      >
                        {link.label}
                      </Link>
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
          <div className="shrink-0 space-y-1.5">
            <p className="text-paper/70 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
              © {new Date().getFullYear()} {brand.name}
            </p>
            {/* The muted foreground this defaults to is a light-ground colour
                and would sink into the ink footer. */}
            <Version value={pkg.version} className="text-paper/70 block" />
          </div>
        </div>
      </Container>
    </footer>
  );
}
