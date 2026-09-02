import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';

import { Ruler } from '@/components/ruler';

export const metadata = { title: 'Page not found' };

/**
 * Outside the `(docs)` group, so a wrong URL does not render a sidebar full of
 * links around a page that is not there.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-24">
      <Ruler className="mb-10" />
      <h1 className="font-title text-title-lg">This page does not exist</h1>
      <p className="mt-4 text-[0.9375rem] leading-7 text-pretty">
        The link may be out of date, or the page may have been renamed. The
        documentation index lists everything there is.
      </p>
      <div className="mt-8">
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          className="font-mono text-xs tracking-[0.14em] uppercase"
        >
          Documentation index
        </Button>
      </div>
    </main>
  );
}
