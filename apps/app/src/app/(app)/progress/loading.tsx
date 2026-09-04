import { Card, CardContent, CardHeader } from '@bandzen/ui/components/card';
import { Skeleton } from '@bandzen/ui/components/skeleton';

/** A progress-shaped placeholder: a header, the trend panel, then card rows. */
export default function Loading() {
  return (
    <div className="max-w-6xl space-y-4" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <PanelSkeleton bodyClassName="h-48" />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PanelSkeleton rows={4} />
        <PanelSkeleton rows={4} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <PanelSkeleton rows={3} />
        <PanelSkeleton rows={4} />
      </div>

      <PanelSkeleton rows={4} />
      <PanelSkeleton rows={5} />
    </div>
  );
}

function PanelSkeleton({
  rows,
  bodyClassName,
}: {
  rows?: number;
  bodyClassName?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {bodyClassName ? (
          <Skeleton className={bodyClassName} />
        ) : (
          Array.from({ length: rows ?? 4 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))
        )}
      </CardContent>
    </Card>
  );
}
