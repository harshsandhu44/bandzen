'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@bandzen/ui/components/button';

/**
 * A submit button that says so while its server action is in flight.
 *
 * The only client-side JavaScript most of these forms have, and it exists for
 * the reason billing's did: the action behind a "start this" button makes
 * several round trips before it redirects, and on mobile data that is seconds
 * of a button that looks pressed and does nothing. `loading.tsx` cannot cover
 * it — no navigation has begun yet, so there is no route transition to show a
 * skeleton for.
 *
 * The label is swapped rather than joined by a spinner: this codebase animates
 * almost nothing, and a word is legible at a glance where a 14px spinner is
 * not. Disabling while pending is the other half — it makes a second tap a
 * no-op rather than a second POST.
 *
 * `disabled` is merged, not overridden, because call sites have their own
 * reasons to be closed (a spent quota, an unpublished task).
 */
export function SubmitButton({
  pendingLabel = 'Starting…',
  disabled,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
