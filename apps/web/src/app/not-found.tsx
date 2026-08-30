import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';

import { Wordmark } from '@/components/marketing/wordmark';

export default function NotFound() {
  return (
    <main className="bg-paper text-ink flex flex-1 flex-col items-center justify-center gap-8 px-6 py-32 text-center">
      <Wordmark />
      <p className="font-mono text-[0.6875rem] tracking-[0.22em] uppercase opacity-60">
        Error 404
      </p>
      <h1 className="font-display text-display-2 max-w-2xl">
        That page isn&rsquo;t here yet.
      </h1>
      <p className="text-slate max-w-md text-balance">
        Bandzen is still being built. The page you were looking for hasn&rsquo;t
        shipped.
      </p>
      <Button
        render={<Link href="/" />}
        nativeButton={false}
        size="xl"
        className="font-mono text-xs tracking-[0.14em] uppercase"
      >
        Back to home
      </Button>
    </main>
  );
}
