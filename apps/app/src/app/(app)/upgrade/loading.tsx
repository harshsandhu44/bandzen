import { Skeleton } from '@bandzen/ui/components/skeleton';

/** Header, plan cards, the "what's included" list. */
export default function Loading() {
  return (
    <div className="max-w-3xl space-y-10" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
