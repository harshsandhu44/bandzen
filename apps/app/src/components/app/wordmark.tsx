import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';
import { Mark } from '@bandzen/ui/components/mark';

/**
 * The wordmark, set the way the marketing one is: Archivo, lowercase, tight,
 * with the chrome tick sitting where a target marker would land on the band
 * scale. Shared so the signed-in shell and the auth screens cannot drift.
 *
 * The mark leads the lockup. Its own tick and the one under "band" are the
 * same device at two scales, which is why they can sit next to each other
 * without reading as a repeat.
 *
 * The link is labelled rather than relying on the visible name, because
 * `collapse` hides that name with `display: none` — which takes it from the
 * accessibility tree too, and would otherwise leave the link nameless.
 */
export function Wordmark({
  href = '/',
  collapse = false,
  className,
}: {
  href?: string;
  /**
   * Drop the name below `sm` and show the mark alone. For the shell, where
   * the lockup shares a row with other controls — not for the auth screens,
   * where the wordmark is the only branding on the page.
   */
  collapse?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Bandzen"
      className={cn('font-title flex items-center gap-2 text-lg', className)}
    >
      <Mark />
      <span
        aria-hidden
        className={cn('relative lowercase', collapse && 'hidden sm:inline')}
      >
        bandzen
        <span className="bg-chrome absolute -bottom-0.5 left-[0.32em] h-0.5 w-[1.62em]" />
      </span>
    </Link>
  );
}
