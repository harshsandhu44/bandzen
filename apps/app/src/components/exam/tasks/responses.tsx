'use client';

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Fragment, useState } from 'react';
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
  /**
   * Store a recorded take and return its URL, or null if it could not be
   * stored. Only the recording renderers use it, and only an attempt supplies
   * it — the task lab has nowhere to put one.
   */
  onUpload?: (blob: Blob) => Promise<string | null>;
  /**
   * Mock rules for a spoken answer: it begins by itself once `ready` (the
   * stimulus has finished), and a `spent` item — left mid-task on an earlier
   * visit — gets no second take. Absent in practice and in the task lab.
   */
  auto?: { ready: boolean; spent: boolean };
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

export function Essay({ item, label, value, onChange }: ResponseRendererProps) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const { minWords, maxWords } = item;
  // Shown, never enforced. PTE penalises a response outside the range rather
  // than refusing it, and a textarea that stops accepting words mid-sentence
  // would be a worse test than the real one.
  const outside =
    words > 0 &&
    ((minWords != null && words < minWords) ||
      (maxWords != null && words > maxWords));
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        rows={12}
        className="text-sm md:text-sm"
      />
      <p
        className={cn(
          'font-mono text-xs tabular-nums',
          outside ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {words} words
        {minWords != null && maxWords != null
          ? ` · ${minWords}\u2013${maxWords} expected`
          : null}
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

/**
 * Gaps filled from a dropdown at each one — PTE's Reading & Writing blanks,
 * where every gap offers a different set of words.
 *
 * Stored exactly as `FillBlank` stores it, one answer per gap in gap order, so
 * `gap_match` marks all three blank renderers without knowing them apart.
 */
export function FillBlankSelect({
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
  // A div rather than a p: `Select` wraps its control in a div, which is
  // invalid inside a paragraph and breaks hydration.
  return (
    <div className="text-sm leading-9">
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 ? (
            <Select
              value={gaps[i] ?? ''}
              onChange={(e) => setGap(i, e.target.value)}
              aria-label={`${label}, gap ${i + 1}`}
              className="mx-1 inline-flex h-7 w-auto"
            >
              <option value="">Choose…</option>
              {(item.gapOptions?.[i] ?? []).map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </Select>
          ) : null}
        </span>
      ))}
    </div>
  );
}

/**
 * Gaps filled from a shared word bank that holds more words than there are
 * gaps — PTE's Reading blanks, where the extra words are the distractors.
 *
 * Drag a word onto a gap, or pick the gap and then the word: dragging alone
 * would shut out keyboard and screen-reader users, exactly as it would in
 * `Reorder`. A filled gap returns its word to the bank when picked again.
 */
export function FillBlankDrag({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const parts = (item.gapped ?? '').split('___');
  const count = parts.length - 1;
  const gaps = Array.from(
    { length: count },
    (_, i) => parseList(value)[i] ?? '',
  );
  const [active, setActive] = useState<number | null>(null);

  const set = (i: number, word: string) => {
    const next = [...gaps];
    // A word lives in one gap at a time; placing it elsewhere moves it.
    for (let j = 0; j < next.length; j++) if (next[j] === word) next[j] = '';
    next[i] = word;
    onChange(JSON.stringify(next));
    setActive(null);
  };

  const clear = (i: number) => {
    const next = [...gaps];
    next[i] = '';
    onChange(JSON.stringify(next));
  };

  const bank = (item.options ?? []).filter((o) => !gaps.includes(o.value));

  return (
    <div className="space-y-4">
      <p className="text-sm leading-9">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < count ? (
              <button
                type="button"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => set(i, e.dataTransfer.getData('text/plain'))}
                onClick={() => (gaps[i] ? clear(i) : setActive(i))}
                aria-label={
                  gaps[i]
                    ? `${label}, gap ${i + 1}: ${gaps[i]}. Pick to clear.`
                    : `${label}, gap ${i + 1}: empty. Pick, then choose a word.`
                }
                className={cn(
                  'mx-1 inline-flex h-7 min-w-24 items-center justify-center border px-2 text-sm',
                  active === i ? 'border-primary' : 'border-input',
                  !gaps[i] && 'text-muted-foreground',
                )}
              >
                {gaps[i] || '\u2014'}
              </button>
            ) : null}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {bank.map((o) => (
          <Button
            key={o.value}
            type="button"
            variant="outline"
            size="sm"
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', o.value)}
            onClick={() => set(active ?? gaps.findIndex((g) => !g), o.value)}
            disabled={active == null && gaps.every(Boolean)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Running text whose words can each be marked — PTE's Highlight Incorrect
 * Words, where the transcript on screen differs from what was read out and the
 * candidate marks every word that does not match.
 *
 * The answer is the positions of the marked words, not the words themselves:
 * the same word may appear twice and only one of them be wrong. Each word is a
 * real button with `aria-pressed`, so this works by keyboard and is announced
 * as a toggle rather than as decorated text.
 */
export function TokenSelect({
  label,
  item,
  value,
  onChange,
}: ResponseRendererProps) {
  const tokens = item.tokens ?? [];
  const marked = new Set(parseList(value));

  const toggle = (i: number) => {
    const next = new Set(marked);
    const at = String(i);
    if (next.has(at)) next.delete(at);
    else next.add(at);
    // Sorted numerically so the stored answer does not depend on the order
    // the candidate happened to click in.
    onChange(JSON.stringify([...next].sort((a, b) => Number(a) - Number(b))));
  };

  return (
    <p aria-label={label} className="text-sm leading-9">
      {/* A real space between the words, not a margin: this is running text,
          and a screen reader reading it continuously — or anyone copying it —
          would otherwise get "Openwaterwarms". */}
      {tokens.map((word, i) => (
        <Fragment key={i}>
          <button
            type="button"
            aria-pressed={marked.has(String(i))}
            onClick={() => toggle(i)}
            className={cn(
              'px-1',
              marked.has(String(i))
                ? 'bg-primary/15 text-foreground underline decoration-primary decoration-2'
                : 'hover:bg-muted',
            )}
          >
            {word}
          </button>{' '}
        </Fragment>
      ))}
    </p>
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
