import { Skeleton } from '@bandzen/ui/components/skeleton';

/** The section interstitial: an eyebrow, a heading, a line, and a panel with a button. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-12" aria-busy role="status">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="space-y-4 border border-border p-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
