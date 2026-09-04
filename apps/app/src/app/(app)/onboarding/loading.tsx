import { Skeleton } from '@bandzen/ui/components/skeleton';

/** The wizard: a heading, a progress row, one question, back/next. */
export default function Loading() {
  return (
    <div className="max-w-xl space-y-8" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-4 w-full" />
      </div>
      <Skeleton className="h-5 w-full" />
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
  );
}
