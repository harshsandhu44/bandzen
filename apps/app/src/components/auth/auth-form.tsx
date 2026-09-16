'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import type { AuthState } from '@/app/(auth)/actions';

/**
 * Every auth screen is the same form: some labelled inputs, one error line and
 * one button. Four near-identical pages would drift from each other, and the
 * one that drifted would be the password field.
 */
export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  fields,
  children,
}: {
  action: (state: AuthState, data: FormData) => Promise<AuthState>;
  submitLabel: string;
  pendingLabel: string;
  fields: {
    name: string;
    label: string;
    type: string;
    autoComplete: string;
    hint?: string;
    optional?: boolean;
  }[];
  /** Links below the button — they differ on every screen. */
  children?: React.ReactNode;
}) {
  const [state, submit, pending] = useActionState<AuthState, FormData>(action, {
    error: null,
  });

  return (
    <form action={submit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required={!field.optional}
            defaultValue={field.name === 'email' ? state.email : undefined}
            disabled={pending}
          />
          {field.hint ? (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          ) : null}
        </div>
      ))}

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>

      {children}
    </form>
  );
}
