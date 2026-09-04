import { Skeleton } from '@bandzen/ui/components/skeleton';

/** The diagnostic launch form: a heading, a short blurb, two fields, a button. */
export default function Loading() {
  return (
    <div className="max-w-md space-y-8" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
