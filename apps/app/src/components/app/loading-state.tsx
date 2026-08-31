import { Skeleton } from '@bandzen/ui/components/skeleton';

/**
 * A page-shaped placeholder.
 *
 * Matches the real layout's rhythm — a header block then a list — so the
 * content does not jump when it arrives. It does not pretend to show data:
 * no fake numbers, no fake rows of text.
 */
export function LoadingState({
  rows = 5,
  showMetrics = false,
}: {
  rows?: number;
  showMetrics?: boolean;
}) {
  return (
    <div className="max-w-3xl space-y-8" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {showMetrics ? (
        <div className="flex gap-10">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-14" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="divide-y divide-border border-y border-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-4">
            <div className="w-full space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-8 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
