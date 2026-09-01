'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { grantRole, type GrantFormState } from './actions';

const initial: GrantFormState = { error: null };

export function GrantForm() {
  const [state, action, pending] = useActionState(grantRole, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="space-y-2">
        <Label htmlFor="grant-email">Email</Label>
        <Input
          id="grant-email"
          name="email"
          type="email"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="grant-role">Role</Label>
        <select
          id="grant-role"
          name="role"
          required
          defaultValue="teacher"
          className="h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        >
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Granting…' : 'Grant role'}
      </Button>

      {state.error ? (
        <p role="alert" className="w-full font-mono text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
