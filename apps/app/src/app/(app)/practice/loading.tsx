import { Card, CardContent, CardHeader } from '@bandzen/ui/components/card';
import { Skeleton } from '@bandzen/ui/components/skeleton';

/** A practice-shaped placeholder: a header, then the three panels. */
export default function Loading() {
  return (
    <div className="max-w-5xl space-y-4" aria-busy role="status">
      <span className="sr-only">Loading</span>

      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-80" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
