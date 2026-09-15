'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState } from 'react';
import { AnswerChoices } from '@bandzen/ui/components/answer-choices';
import { Button } from '@bandzen/ui/components/button';
import { Checkbox } from '@bandzen/ui/components/checkbox';
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';
import { Textarea } from '@bandzen/ui/components/textarea';
import { cn } from '@bandzen/ui/lib/utils';
import type { TaskItem } from '@/lib/task-content';

/**
 * The answer controls. Every renderer takes the same props and reports its
 * answer as one string, because that is what `attempt_answers.value` stores
 * and what autosave sends: a choice is its value; anything with several parts
 * (checked options, gaps, an order) is a JSON array.
 */
export type ResponseRendererProps = {
  id: string;
  label: string;
  item: TaskItem;
  value: string;
  onChange: (value: string) => void;
};

const parseList = (value: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

export function ChoiceCards({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  return (
    <AnswerChoices
      label={label}
      choices={(item.options ?? []).map((o) => o.label)}
      value={value}
      onValueChange={onChange}
    />
  );
}

export function ChoiceSelect({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  return (
    <div className="max-w-sm">
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">Choose…</option>
        {(item.options ?? []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export function MultiChoice({
  id,
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const checked = new Set(parseList(value));
  const toggle = (v: string, on: boolean) => {
    const next = new Set(checked);
    if (on) next.add(v);
    else next.delete(v);
    onChange(JSON.stringify([...next].sort()));
  };
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">{label}</legend>
      {(item.options ?? []).map((o) => (
        <label
          key={o.value}
          htmlFor={`${id}-${o.value}`}
          className="flex cursor-pointer items-start gap-3 border border-border px-3 py-2.5 text-sm has-data-checked:border-primary"
        >
          <Checkbox
            id={`${id}-${o.value}`}
            checked={checked.has(o.value)}
            onCheckedChange={(on) => toggle(o.value, on)}
            className="mt-0.5"
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

export function TextInput({ label, value, onChange }: ResponseRendererProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="max-w-xs font-mono"
    />
  );
}

export function Essay({ label, value, onChange }: ResponseRendererProps) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        rows={12}
        className="text-sm md:text-sm"
      />
      <p className="font-mono text-xs text-muted-foreground tabular-nums">
        {words} words
      </p>
    </div>
  );
}

export function FillBlank({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const parts = (item.gapped ?? '').split('___');
  const gaps = parseList(value);
  const setGap = (i: number, v: string) => {
    const next = Array.from(
      { length: parts.length - 1 },
      (_, j) => gaps[j] ?? '',
    );
    next[i] = v;
    onChange(JSON.stringify(next));
  };
  return (
    <p className="text-sm leading-9">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <Input
              value={gaps[i] ?? ''}
              onChange={(e) => setGap(i, e.target.value)}
              aria-label={`${label}, gap ${i + 1}`}
              className="mx-1 inline-flex h-7 w-32 font-mono"
            />
          ) : null}
        </span>
      ))}
    </p>
  );
}

/**
 * Drag to reorder, or move with the arrow buttons — dragging alone would shut
 * out keyboard and screen-reader users. The answer is the token indices in the
 * candidate's order.
 */
export function Reorder({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const tokens = item.tokens ?? [];
  const saved = parseList(value).map(Number);
  const order =
    saved.length === tokens.length ? saved : tokens.map((_, i) => i);
  const [dragging, setDragging] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [picked] = next.splice(from, 1);
    next.splice(to, 0, picked!);
    onChange(JSON.stringify(next));
  };

  return (
    <ol aria-label={label} className="space-y-2">
      {order.map((tokenIndex, position) => (
        <li
          key={tokenIndex}
          draggable
          onDragStart={() => setDragging(position)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragging != null) move(dragging, position);
            setDragging(null);
          }}
          className={cn(
            'flex cursor-grab items-center gap-3 border border-border bg-background px-3 py-2 text-sm',
            dragging === position && 'opacity-50',
          )}
        >
          <span className="font-mono text-xs text-muted-foreground">
            {position + 1}
          </span>
          <span className="flex-1">{tokens[tokenIndex]}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={position === 0}
            onClick={() => move(position, position - 1)}
            aria-label={`Move "${tokens[tokenIndex]}" up`}
          >
            <ArrowUp aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={position === order.length - 1}
            onClick={() => move(position, position + 1)}
            aria-label={`Move "${tokens[tokenIndex]}" down`}
          >
            <ArrowDown aria-hidden />
          </Button>
        </li>
      ))}
    </ol>
  );
}

/** Build a sentence by picking words from a bank; pick a placed word to return it. */
export function SentenceBuilder({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const tokens = item.tokens ?? [];
  const placed = parseList(value).map(Number);
  const set = (next: number[]) => onChange(JSON.stringify(next));

  return (
    <div className="space-y-4">
      <p
        aria-label={label}
        className="min-h-11 border-b border-border pb-2 text-sm"
      >
        {placed.length ? (
          placed.map((t, i) => (
            <button
              key={`${t}-${i}`}
              type="button"
              onClick={() => set(placed.filter((_, j) => j !== i))}
              className="mr-1.5 mb-1.5 border border-primary px-2 py-1"
            >
              {tokens[t]}
            </button>
          ))
        ) : (
          <span className="text-muted-foreground">Pick words below.</span>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((word, i) =>
          placed.includes(i) ? null : (
            <Button
              key={i}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set([...placed, i])}
            >
              {word}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
