import { Skeleton } from '@bandzen/ui/components/skeleton';

/** Reader-shaped placeholder: breadcrumb, the stage rail column, then prose. */
export default function Loading() {
  return (
    <div className="max-w-5xl space-y-6" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <Skeleton className="h-3 w-56" />

      <div className="lg:grid lg:grid-cols-[9rem_1fr] lg:gap-12 lg:items-start">
        <div className="hidden space-y-2 lg:block">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>

        <div className="max-w-prose space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />

          {[0, 1].map((i) => (
            <div key={i} className="space-y-3 pt-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
