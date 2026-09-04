import { Skeleton } from '@bandzen/ui/components/skeleton';

/** The result: a band header, the by-skill scales, then the plan. */
export default function Loading() {
  return (
    <div className="max-w-2xl space-y-10" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
