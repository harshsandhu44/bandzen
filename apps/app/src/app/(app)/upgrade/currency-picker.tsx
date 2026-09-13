'use client';

import { useTransition } from 'react';
import type { Currency } from '@bandzen/pricing/currency';
import { setCurrency } from './actions';

/**
 * Change what you are quoted in.
 *
 * The options come from the server, which built them from location — so this
 * cannot offer a currency the server would then refuse. Writing the cookie is
 * a server action rather than `document.cookie` because the choice has to
 * outlive this page and reach the marketing site too.
 */
export function CurrencyPicker({
  current,
  options,
}: {
  current: Currency;
  options: readonly Currency[];
}) {
  const [pending, startTransition] = useTransition();

  if (options.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="sr-only">Currency</span>
      <select
        className="border border-border bg-transparent px-2 py-1 text-xs tabular-nums disabled:opacity-50"
        value={current}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value;
          startTransition(() => {
            void setCurrency(next);
          });
        }}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
