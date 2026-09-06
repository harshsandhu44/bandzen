import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';
import { Wordmark } from '@bandzen/ui/components/wordmark';

export default function AppNotFound() {
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
        There is nothing here
      </h1>
      <p className="max-w-md text-sm text-muted-foreground text-balance">
        This page does not exist, or it belongs to a different account.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/" />}
        size="xl"
        className="font-mono text-xs tracking-[0.14em] uppercase"
      >
        Back to your dashboard
      </Button>
    </main>
  );
}
