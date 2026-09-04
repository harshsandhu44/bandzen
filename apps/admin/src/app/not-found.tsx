import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow } from '@bandzen/ui/components/primitives';

export default function CmsNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 p-10">
      <Eyebrow>Not found</Eyebrow>
      <h1 className="font-title text-title-lg">There is nothing here</h1>
      <p className="text-sm text-muted-foreground">
        This page does not exist, or the item was deleted.
      </p>
      <Button nativeButton={false} render={<Link href="/" />}>
        Back to overview
      </Button>
    </div>
  );
}
