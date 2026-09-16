'use client';

import { useActionState } from 'react';
import { Badge } from '@bandzen/ui/components/badge';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import type { AuthState } from '@/app/(auth)/actions';

/**
 * Every auth screen is the same form, laid out as shadcn's login-02: a centred
 * heading, labelled inputs, one error line, one button, then whatever the page
 * puts underneath (Google, a link to the other screen). Four near-identical
 * pages would drift from each other, and the one that drifted would be the
 * password field.
 *
 * The page's extras render after the `<form>`, not inside it: the Google
 * button is a form of its own, and forms cannot nest.
 */
export function AuthForm({
  action,
  title,
  description,
  badge,
  notice,
  submitLabel,
  pendingLabel,
  fields,
  children,
}: {
  action: (state: AuthState, data: FormData) => Promise<AuthState>;
  title: string;
  description?: string;
  /** A short status beside the title, e.g. "Beta". */
  badge?: string;
  /** A message the page arrived with, such as a failed Google sign-in. */
  notice?: string;
  submitLabel: string;
  pendingLabel: string;
  fields: {
    name: string;
    label: string;
    type: string;
    autoComplete: string;
    hint?: string;
    optional?: boolean;
    /** The end of the label row: the "Forgot your password?" link. */
    aside?: React.ReactNode;
  }[];
  /** Below the form: the Google option and the link to the other screen. */
  children?: React.ReactNode;
}) {
  const [state, submit, pending] = useActionState<AuthState, FormData>(action, {
    error: null,
  });
  const error = state.error ?? notice;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-heading flex flex-wrap items-center justify-center gap-2 text-2xl font-semibold text-balance">
          {title}
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </h1>
        {description ? (
          <p className="text-sm text-balance text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      <form action={submit} className="flex flex-col gap-6">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-2">
            <div className="flex items-center">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.aside ? (
                <span className="ml-auto text-sm">{field.aside}</span>
              ) : null}
            </div>
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

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </form>

      {children}
    </div>
  );
}
