import { Fragment } from 'react';
import Link from 'next/link';

/**
 * The trail back up a section. Learn now has three levels (hub -> module ->
 * lesson), which is one more than a single "back" link reads well for.
 *
 * The last segment is the current page: rendered as plain text, marked
 * `aria-current`. Earlier segments link if they carry an `href`.
 */
export function Breadcrumb({
  segments,
}: {
  segments: readonly { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {segments.map((segment, i) => {
          const last = i === segments.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 ? (
                <li aria-hidden className="opacity-50">
                  /
                </li>
              ) : null}
              <li>
                {segment.href && !last ? (
                  <Link
                    href={segment.href}
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {segment.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? 'page' : undefined}
                    className={last ? 'text-foreground' : undefined}
                  >
                    {segment.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
