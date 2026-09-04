import { Skeleton } from '@bandzen/ui/components/skeleton';

/**
 * Shown while an editor's `[id]` route fetches. Mirrors PageHeader +
 * EditorShell's shape (form column, sticky rail) rather than the generic
 * list skeleton one level up.
 */
export default function EditorLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="order-2 space-y-4 lg:order-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
        <div className="order-1 space-y-3 lg:order-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}
