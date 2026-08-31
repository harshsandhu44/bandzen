import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * The wordmark, set the way the marketing one is: Archivo, lowercase, tight,
 * with the chrome tick sitting where a target marker would land on the band
 * scale. Shared so the signed-in shell and the auth screens cannot drift.
 */
export function Wordmark({
  href = '/',
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('relative font-title text-lg lowercase', className)}
    >
      bandzen
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-[0.32em] h-0.5 w-[1.62em] bg-chrome"
      />
    </Link>
  );
}
