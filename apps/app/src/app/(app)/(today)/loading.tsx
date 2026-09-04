import { Card, CardContent, CardHeader } from '@bandzen/ui/components/card';
import { Skeleton } from '@bandzen/ui/components/skeleton';

/**
 * A dashboard-shaped placeholder.
 *
 * Matches the real layout's rhythm — a stat-card row, the primary action, then
 * the two-column grid — so nothing jumps when the data arrives. It shows no
 * numbers or text, only the frame.
 */
export default function Loading() {
  return (
    <div className="max-w-6xl space-y-4" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <div className="space-y-5">
        <Skeleton className="h-8 w-64" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-9 w-full" />
      </div>

      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-4 w-72" />

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-7">
          <PanelSkeleton rows={3} />
          <PanelSkeleton rows={4} />
        </div>
        <div className="space-y-4 lg:col-span-5">
          <PanelSkeleton rows={5} />
          <PanelSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}
