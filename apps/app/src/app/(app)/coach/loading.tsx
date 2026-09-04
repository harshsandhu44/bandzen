import { Skeleton } from '@bandzen/ui/components/skeleton';

/** Chat-shaped: a header, a couple of prompt suggestions, the composer. */
export default function Loading() {
  return (
    <div className="flex max-w-3xl flex-col gap-6" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
      <Skeleton className="mt-auto h-24 w-full" />
    </div>
  );
}
