import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';
import { Mark } from '@bandzen/ui/components/mark';

/**
 * The wordmark, set the way the marketing one is: Archivo, lowercase, tight,
 * with the tick sitting where a target marker would land on the band scale.
 * Shared so the signed-in shells and the auth screens cannot drift.
 *
 * The mark leads the lockup. Its own tick and the one under "band" are the
 * same device at two scales, which is why they can sit next to each other
 * without reading as a repeat.
 *
 * The tick is `bg-tick`, not `bg-chrome`. `--tick` defaults to the accent, so
 * apps/app is unchanged; apps/admin retargets it to its own primary. That one
 * token is the whole visual difference between the two shells' lockups, and it
 * frees `--chrome` to mean exactly one thing in the CMS — unpublished.
 *
 * The link is labelled rather than relying on the visible name, because
 * `collapse` hides that name with `display: none` — which takes it from the
 * accessibility tree too, and would otherwise leave the link nameless.
 */
export function Wordmark({
  href = '/',
  collapse = false,
  tag,
  className,
}: {
  href?: string;
  /**
   * Drop the name below `sm` and show the mark alone. For a shell, where the
   * lockup shares a row with other controls — not for the auth screens, where
   * the wordmark is the only branding on the page.
   */
  collapse?: boolean;
  /**
   * A short mono suffix naming the surface, e.g. "CMS". Set on apps/admin so
   * the lockup is unambiguous even at a glance, and left unset on apps/app,
   * where the product needs no qualifier. Survives `collapse` on purpose: the
   * mark alone is the same in both apps, so the tag is the only thing left
   * distinguishing them at that width.
   */
  tag?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={tag ? `Bandzen ${tag}` : 'Bandzen'}
      className={cn('font-title flex items-center gap-2 text-lg', className)}
    >
      <Mark />
      <span
        aria-hidden
        className={cn('relative lowercase', collapse && 'hidden sm:inline')}
      >
        bandzen
        <span className="bg-tick absolute -bottom-0.5 left-[0.32em] h-0.5 w-[1.62em]" />
      </span>
      {tag ? (
        <span
          aria-hidden
          className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase"
        >
          {tag}
        </span>
      ) : null}
    </Link>
  );
}
