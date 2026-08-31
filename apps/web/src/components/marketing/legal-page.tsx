import type { ReactNode } from 'react';

import { Container } from './section';
import { Footer } from './footer';
import { Navbar } from './navbar';

/**
 * The shell every non-landing page uses.
 *
 * `Navbar` and `Footer` are rendered per page rather than in the root layout,
 * so a new route has to bring them itself. `RevealProvider` is deliberately
 * absent: `bz-reveal` is double-guarded and renders fully visible without it,
 * and none of these pages should animate anyway.
 *
 * The `pt-32` is load-bearing — the header is `fixed`, so a page whose first
 * element is ordinary text starts underneath it otherwise.
 */
export function LegalPage({
  title,
  intro,
  children,
  updated,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  updated?: string;
}) {
  return (
    <>
      <Navbar />
      <main id="main" className="bg-paper text-ink flex-1 pt-32 pb-24">
        <Container>
          <div className="max-w-2xl">
            <h1 className="font-display text-display-3 text-balance">
              {title}
            </h1>
            {intro ? (
              <p className="text-slate mt-6 text-base leading-relaxed text-pretty">
                {intro}
              </p>
            ) : null}
            {updated ? (
              <p className="text-slate mt-6 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
                Last updated {updated}
              </p>
            ) : null}
            <div className="mt-12 space-y-10">{children}</div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

/** One titled clause. Legal prose reads better numbered than run together. */
export function Clause({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="text-slate space-y-3 text-sm leading-relaxed text-pretty">
        {children}
      </div>
    </section>
  );
}
