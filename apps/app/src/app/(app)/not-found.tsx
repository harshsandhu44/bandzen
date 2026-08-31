import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';

export default function AppNotFound() {
  return (
    <div className="max-w-md space-y-4 py-10">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Not found
      </p>
      <h1 className="text-2xl font-medium tracking-tight">
        There is nothing here
      </h1>
      <p className="text-sm text-muted-foreground">
        This page does not exist, or it belongs to a different account.
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        Back to your dashboard
      </Button>
    </div>
  );
}
