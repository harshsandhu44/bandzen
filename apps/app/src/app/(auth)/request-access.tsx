'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { requestAccess, type FormState } from './actions';

const initial: FormState = { error: null };

export function RequestAccess() {
  const [state, action, pending] = useActionState(requestAccess, initial);

  if (state.done) {
    return (
      <p className="text-sm text-muted-foreground">
        You&rsquo;re on the list. We&rsquo;ll email an invitation when a place
        opens up.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="request-email">Email</Label>
        <Input
          id="request-email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      {state.error ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {pending ? 'Working…' : 'Request access'}
      </Button>
    </form>
  );
}
