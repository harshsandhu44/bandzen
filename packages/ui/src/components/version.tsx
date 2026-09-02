import { cn } from '@bandzen/ui/lib/utils';

/**
 * The running version of whichever app renders it.
 *
 * The value is that app's own package.json version, read in a server
 * component and handed in as a string. Importing the JSON inside a
 * `'use client'` subtree would inline the whole file — dependency list,
 * scripts and all — into the browser bundle, so the import stays on the
 * server and only this string crosses over.
 *
 * Mono, muted, tracked out: the same register as `Eyebrow`, because this is
 * instrumentation rather than content. Not uppercased, unlike the eyebrows —
 * that would turn the `v` into a `V` and the whole point is that it reads as
 * the version string you typed into package.json.
 *
 * A production build always carries a version no other build has, because
 * nothing deploys without a bump. So this number on its own names what is
 * live, with no commit SHA next to it.
 *
 * A `<span>`, so it can sit inside a footer row or a `<dd>` without the
 * caller having to undo a block element.
 */
export function Version({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-mono text-[0.625rem] tracking-[0.16em] tabular-nums text-muted-foreground',
        className,
      )}
    >
      v{value}
    </span>
  );
}
