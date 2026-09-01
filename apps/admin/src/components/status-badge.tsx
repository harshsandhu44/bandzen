import { Badge } from '@bandzen/ui/components/badge';
import type { ContentStatus } from '@bandzen/db/schema';

export function StatusBadge({ status }: { status: ContentStatus }) {
  return (
    <Badge variant={status === 'published' ? 'default' : 'secondary'}>
      {status}
    </Badge>
  );
}
