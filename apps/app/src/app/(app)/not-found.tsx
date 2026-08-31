import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';

export default function AppNotFound() {
  return (
    <div className="max-w-md space-y-4 py-10">
      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Not found
      </p>
      <h1 className="font-title text-title-lg">There is nothing here</h1>
      <p className="text-sm text-muted-foreground">
        This page does not exist, or it belongs to a different account.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Back to your dashboard
      </Button>
    </div>
  );
}
