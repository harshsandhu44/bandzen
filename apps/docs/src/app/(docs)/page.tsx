import Link from 'next/link';

import { Eyebrow } from '@bandzen/ui/components/primitives';

import { Ruler } from '@/components/ruler';
import { NAV } from '@/content/nav';

export const metadata = {
  title: 'Bandzen docs',
  description:
    'How to use Bandzen — for candidates preparing for IELTS, and for teachers writing the content.',
};

/**
 * The front door.
 *
 * It opens on the band ruler rather than a headline over a gradient, because
 * the 0–9 scale is the one thing every page under it is ultimately about, and
 * it is already the logo, the favicon and the social image.
 *
 * Then two doors, because there are exactly two audiences and they share almost
 * nothing: a candidate sitting the exam, and a teacher writing what they sit.
 */
export default function DocsHome() {
  const [candidates, teachers] = NAV;

  return (
    <div className="pb-8">
      <Ruler className="mb-10" />

      <h1 className="font-title text-title-lg">Bandzen documentation</h1>
      <p className="mt-4 text-[0.9375rem] leading-7 text-pretty">
        Bandzen is an IELTS preparation product. Reading and Writing have
        marking engines behind them; Listening and Speaking do not yet, and the
        product says so wherever they appear. These pages describe what is
        built, and nothing else.
      </p>

      <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-2">
        {[candidates, teachers].map((group) => (
          <section key={group.title} className="bg-background p-6">
            <Eyebrow as="h2">{group.title}</Eyebrow>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              {group.blurb}
            </p>

            <ul className="mt-5 space-y-2">
              {group.pages.slice(0, 4).map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="text-sm underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>

            <p className="mt-5 font-mono text-[0.625rem] tracking-[0.18em] text-muted-foreground uppercase">
              {group.pages.length} pages
            </p>
          </section>
        ))}
      </div>

      <h2 className="font-title text-title mt-14">Start here</h2>
      <p className="mt-4 text-[0.9375rem] leading-7 text-pretty">
        If you have just been invited,{' '}
        <Link
          href="/candidates/setting-up"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Setting up
        </Link>{' '}
        covers the six questions Bandzen asks and what each one changes. If you
        have just been given a CMS role,{' '}
        <Link
          href="/teachers/getting-access"
          className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
        >
          Getting access
        </Link>{' '}
        covers what you can edit and what happens when you publish.
      </p>
    </div>
  );
}
