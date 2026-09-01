'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Label } from '@bandzen/ui/components/label';
import { importPassageAction, type ImportState } from './actions';

const initial: ImportState = { error: null };

export function ImportForm() {
  const [state, action, pending] = useActionState(importPassageAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file">Passage JSON</Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".json,application/json"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Importing…' : 'Import'}
      </Button>
      {state.error ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
