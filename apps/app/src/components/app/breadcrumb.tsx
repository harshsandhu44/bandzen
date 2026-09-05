import { Fragment } from 'react';
import {
  Breadcrumb as BreadcrumbRoot,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@bandzen/ui/components/breadcrumb';

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
    <BreadcrumbRoot>
      <BreadcrumbList>
        {segments.map((segment, i) => {
          const last = i === segments.length - 1;
          return (
            <Fragment key={i}>
              {i > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem>
                {segment.href && !last ? (
                  <BreadcrumbLink href={segment.href}>
                    {segment.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </BreadcrumbRoot>
  );
}
