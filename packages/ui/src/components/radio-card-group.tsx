'use client';

import type { ReactNode } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * A radio group whose options are cards, in the product surface's own style —
 * a filled ground and a rule when selected, not colour alone.
 *
 * The Base UI `RadioGroup` owns keyboard navigation, arrow keys, roving
 * tabindex and (via `name`) native form submission, so a `<form action>` on
 * the server still sees the value with no client JS. Used by onboarding,
 * settings and the exam answer controls.
 */

export type RadioCard = { value: string; label: ReactNode; hint?: ReactNode };

export function RadioCardGroup({
  name,
  legend,
  description,
  cards,
  defaultValue,
  value,
  onValueChange,
  required,
  columns = 2,
  className,
}: {
  name?: string;
  legend?: string;
  description?: ReactNode;
  cards: readonly RadioCard[];
  defaultValue?: string | null;
  value?: string | null;
  onValueChange?: (value: string) => void;
  required?: boolean;
  columns?: 1 | 2 | 3 | 4 | 5;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-2', className)}>
      {legend ? (
        <legend className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {legend}
        </legend>
      ) : null}
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <RadioGroup
        name={name}
        defaultValue={defaultValue ?? undefined}
        value={value ?? undefined}
        onValueChange={
          onValueChange ? (v) => onValueChange(String(v)) : undefined
        }
        required={required}
        className={cn(
          'grid gap-2',
          columns === 1 && 'grid-cols-1',
          columns === 2 && 'grid-cols-2',
          columns === 3 && 'grid-cols-2 sm:grid-cols-3',
          columns === 4 && 'grid-cols-2 sm:grid-cols-4',
          columns === 5 && 'grid-cols-3 sm:grid-cols-5',
        )}
      >
        {cards.map((card) => (
          <Radio.Root
            key={card.value}
            value={card.value}
            className={cn(
              'group flex cursor-pointer flex-col gap-0.5 border border-border px-3 py-2.5 text-left text-sm transition-colors outline-none',
              'hover:border-foreground/30',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              'data-[checked]:border-primary data-[checked]:bg-primary/5 data-[checked]:text-foreground',
            )}
          >
            <span className="font-medium">{card.label}</span>
            {card.hint ? (
              <span className="text-xs text-muted-foreground">{card.hint}</span>
            ) : null}
          </Radio.Root>
        ))}
      </RadioGroup>
    </fieldset>
  );
}
