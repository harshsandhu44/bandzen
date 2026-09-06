import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';
import { Wordmark } from '@bandzen/ui/components/wordmark';

export const metadata = { title: 'Page not found' };

/**
 * Outside the `(docs)` group, so a wrong URL does not render a sidebar full of
 * links around a page that is not there.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <Wordmark href="/" />
      <p className="font-mono text-[0.6875rem] tracking-[0.22em] text-muted-foreground uppercase">
        Error 404
      </p>
      <p aria-hidden className="font-pixel text-7xl leading-none md:text-8xl">
        404
      </p>
      <h1 className="font-title max-w-2xl text-4xl text-balance">
        This page does not exist
      </h1>
      <p className="max-w-md text-sm text-muted-foreground text-balance">
        The link may be out of date, or the page may have been renamed. The
        documentation index lists everything there is.
      </p>
      <Button
        render={<Link href="/" />}
        nativeButton={false}
        size="xl"
        className="font-mono text-xs tracking-[0.14em] uppercase"
      >
        Documentation index
      </Button>
    </main>
  );
}
