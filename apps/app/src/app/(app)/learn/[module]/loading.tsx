import { Card, CardContent, CardHeader } from '@bandzen/ui/components/card';
import { Skeleton } from '@bandzen/ui/components/skeleton';

/** Module-shaped placeholder: breadcrumb, header, tabs, then the group panels. */
export default function Loading() {
  return (
    <div className="max-w-3xl space-y-6" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <Skeleton className="h-3 w-32" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-52" />
        </div>
        <Skeleton className="h-10 w-14" />
      </div>

      <div className="flex gap-6 border-b border-border pb-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-4 w-16" />
        ))}
      </div>

      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[0, 1].map((j) => (
              <div key={j} className="flex gap-3">
                <Skeleton className="size-3.5 shrink-0 rounded-full" />
                <div className="w-full space-y-1.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
