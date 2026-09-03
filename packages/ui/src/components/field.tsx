'use client';

import * as React from 'react';
import { Label } from '@bandzen/ui/components/label';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * Label + control + hint + error, wired together. Generates the id, points
 * the label at the control, and links the hint and error through
 * aria-describedby / aria-invalid so a screen reader hears the same context a
 * sighted user reads. Replaces the hand-rolled
 * `<div className="space-y-2"><Label/><Input/></div>` in every editor.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  /** A single form control — Input, Textarea, Select. */
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span aria-hidden className="text-muted-foreground">
            *
          </span>
        ) : null}
      </Label>
      {React.cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground text-pretty">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
