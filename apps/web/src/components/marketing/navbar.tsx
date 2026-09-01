'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@bandzen/ui/components/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@bandzen/ui/components/sheet';
import { cn } from '@bandzen/ui/lib/utils';

import { brand, cta, nav } from '@/content/sections';

import { Wordmark } from './wordmark';

export function Navbar() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  // Scroll state without a scroll listener: watch a 1px sentinel at the top.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setPinned(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Section spy. Marks the nav item whose section owns the upper viewport.
  useEffect(() => {
    const ids = nav.map((item) => item.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: '-20% 0px -70% 0px' },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute top-0 h-px w-full" />
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
          pinned
            ? 'bg-paper/80 border-border border-b backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav
          aria-label="Main"
          className="mx-auto flex h-16 w-full max-w-7xl items-center gap-8 px-6 md:h-20 md:px-10"
        >
          <Link
            href="/"
            className="focus-visible:ring-cobalt shrink-0 focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:outline-none"
          >
            <Wordmark collapse />
            <span className="sr-only">
              {brand.name} — {brand.tagline}
            </span>
          </Link>

          <ul className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={active === item.href ? 'true' : undefined}
                  className={cn(
                    'focus-visible:ring-cobalt relative block px-3 py-2 font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    active === item.href
                      ? 'text-ink'
                      : 'text-slate hover:text-ink',
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={cn(
                      'bg-cobalt absolute inset-x-3 bottom-1 h-px origin-left transition-transform duration-300',
                      active === item.href ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="ml-auto hidden items-center gap-2 lg:flex">
            <Button
              render={<Link href={cta.signIn.href} />}
              nativeButton={false}
              variant="ghost"
              size="lg"
              className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
            >
              {cta.signIn.label}
            </Button>
            <Button
              render={<Link href={cta.nav.href} />}
              nativeButton={false}
              size="lg"
              className="font-mono text-[0.6875rem] tracking-[0.14em] uppercase"
            >
              {cta.nav.label}
            </Button>
          </div>

          <div className="ml-auto lg:hidden">
            <Sheet>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label="Open menu"
                    className="size-11"
                  >
                    <Menu />
                  </Button>
                }
              />
              <SheetContent
                side="right"
                showCloseButton={false}
                className="bg-ink text-paper border-none p-0"
              >
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  {brand.name} navigation
                </SheetDescription>

                <div className="flex items-center justify-between px-6 py-5">
                  <Wordmark className="text-paper" />
                  <SheetClose
                    render={
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        aria-label="Close menu"
                        className="text-paper hover:bg-paper/10 hover:text-paper size-11"
                      >
                        <X />
                      </Button>
                    }
                  />
                </div>

                <ul className="flex flex-col px-6 pt-6">
                  {nav.map((item, i) => (
                    <li key={item.href} className="border-paper/10 border-b">
                      <SheetClose
                        nativeButton={false}
                        render={
                          <a
                            href={item.href}
                            className="focus-visible:ring-chrome flex items-baseline gap-4 py-4 focus-visible:ring-2 focus-visible:outline-none"
                          >
                            <span className="text-paper/40 font-mono text-[0.625rem] tabular-nums">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="font-display text-3xl">
                              {item.label}
                            </span>
                          </a>
                        }
                      />
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-3 p-6">
                  <Button
                    render={<Link href={cta.nav.href} />}
                    nativeButton={false}
                    size="xl"
                    className="w-full font-mono text-xs tracking-[0.14em] uppercase"
                  >
                    {cta.nav.label}
                  </Button>
                  <Button
                    render={<Link href={cta.signIn.href} />}
                    nativeButton={false}
                    variant="outline"
                    size="xl"
                    className="text-paper border-paper/25 hover:bg-paper/10 hover:text-paper w-full bg-transparent font-mono text-xs tracking-[0.14em] uppercase"
                  >
                    {cta.signIn.label}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
    </>
  );
}
