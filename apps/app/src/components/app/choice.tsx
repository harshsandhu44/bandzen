import type { ReactNode } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * A radio group that looks like the rest of the app.
 *
 * Real `<input type="radio">` elements inside a `<fieldset>`, styled with
 * `peer-checked` — so keyboard navigation, arrow keys, form submission and
 * required-field validation are the browser's job rather than ours. The
 * selected state is a filled ground and a rule, not a colour alone.
 */

export type Choice = { value: string; label: string; hint?: string };

export function ChoiceGroup({
  name,
  legend,
  choices,
  defaultValue,
  required,
  columns = 2,
  description,
}: {
  name: string;
  legend: string;
  choices: readonly Choice[];
  defaultValue?: string | null;
  required?: boolean;
  columns?: 2 | 3 | 4;
  description?: ReactNode;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        {legend}
      </legend>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div
        className={cn(
          'grid gap-2',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 sm:grid-cols-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4',
        )}
      >
        {choices.map((choice) => (
          <label
            key={choice.value}
            className="relative flex cursor-pointer flex-col"
          >
            <input
              type="radio"
              name={name}
              value={choice.value}
              defaultChecked={defaultValue === choice.value}
              required={required}
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex flex-col gap-0.5 border border-border px-3 py-2.5 text-sm transition-colors',
                'peer-hover:border-foreground/30',
                'peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-foreground',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
              )}
            >
              <span className="font-medium">{choice.label}</span>
              {choice.hint ? (
                <span className="text-xs text-muted-foreground">
                  {choice.hint}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
