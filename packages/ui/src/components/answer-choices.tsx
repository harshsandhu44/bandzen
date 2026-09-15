'use client';

import type { KeyboardEvent } from 'react';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';

import { cn } from '@bandzen/ui/lib/utils';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * An exam question's choices as full-width rows: the shadcn Questionnaire's
 * choice treatment (radio dot, label, letter badge) on a Base UI `RadioGroup`.
 * Not the Questionnaire itself — that is a one-question-per-screen `<form>`,
 * and the exam runner shows a whole question block at once.
 *
 * A letter key picks its choice, but only while focus is inside this group:
 * keydown reaches the group from its own radios and nowhere else, so typing in
 * a sentence-completion box never answers a neighbouring question.
 */
export function AnswerChoices({
  label,
  choices,
  value,
  onValueChange,
  className,
}: {
  label: string;
  choices: readonly string[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.key.length !== 1) return;
    const i = LETTERS.indexOf(e.key.toUpperCase());
    if (i < 0 || i >= choices.length) return;
    e.preventDefault();
    onValueChange(choices[i]);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[i]?.focus();
  };

  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onValueChange={(v) => onValueChange(String(v))}
      onKeyDown={onKeyDown}
      className={cn('grid max-w-md gap-2', className)}
    >
      {choices.map((choice, i) => (
        <Radio.Root
          key={choice}
          value={choice}
          aria-keyshortcuts={LETTERS[i]}
          className={cn(
            'group flex min-h-11 cursor-pointer items-start gap-2.5 border border-input px-3 py-2.5 text-left text-sm transition-colors outline-none',
            'hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50',
            'data-[checked]:border-foreground/30 data-[checked]:bg-muted',
          )}
        >
          <span
            aria-hidden
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-input group-data-[checked]:border-primary group-data-[checked]:bg-primary"
          >
            <span className="hidden size-2 rounded-full bg-primary-foreground group-data-[checked]:block" />
          </span>
          <span className="min-w-0 flex-1 leading-snug">{choice}</span>
          <span
            aria-hidden
            className="mt-0.5 flex size-4 shrink-0 items-center justify-center border border-input bg-background font-mono text-[0.625rem] leading-none text-muted-foreground"
          >
            {LETTERS[i]}
          </span>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
