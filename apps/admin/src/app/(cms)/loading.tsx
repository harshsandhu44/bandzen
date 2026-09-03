import { Skeleton } from '@bandzen/ui/components/skeleton';

/** Shown while a CMS route's server component fetches. Shape, not spinner. */
export default function CmsLoading() {
  return (
    <div className="max-w-4xl space-y-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-3 border-y border-border py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
