'use client';

import { useActionState } from 'react';
import type { ScoreScale } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Select } from '@bandzen/ui/components/select';
import { Panel } from '@/components/app/primitives';

/**
 * Where a candidate tells us what they actually scored.
 *
 * Asked for plainly and kept apart from the estimate above it: this is how the
 * estimate gets checked against reality later, and it is worth nothing if it
 * is ever mistaken for a Bandzen number.
 */
export function OfficialScoreForm({
  scale,
  skills,
  action,
  recorded,
}: {
  scale: ScoreScale;
  /** The exam's skills, each an optional field off the same score report. */
  skills: { key: string; label: string }[];
  /** Resolves to an error to show, or null once saved. */
  action: (formData: FormData) => Promise<string | null>;
  /** What they have already told us, if anything. */
  recorded: { score: number; takenOn: string | null }[];
}) {
  const [error, submit, pending] = useActionState(
    (_: string | null, data: FormData) => action(data),
    null,
  );
  const scoreInput = {
    type: 'number',
    inputMode: 'numeric',
    min: scale.min,
    max: scale.max,
    step: scale.step,
    className: 'w-24 font-mono',
  } as const;

  return (
    <Panel headingId="official" title="Sat the real test?">
      {recorded.length ? (
        <ul className="mb-4 space-y-1 text-sm">
          {recorded.map((r, i) => (
            <li key={i} className="flex justify-between">
              <span className="font-mono tabular-nums">{r.score}</span>
              <span className="text-muted-foreground">
                {r.takenOn ?? 'date not given'}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mb-4 text-sm text-muted-foreground text-pretty">
        Tell us your real score and we can check our estimate against it. The
        skill scores are optional but help most. It is stored on its own — it
        never becomes one of your Bandzen scores.
      </p>

      <form action={submit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="score">Your score</Label>
          <Input id="score" name="score" required {...scoreInput} />
        </div>
        {skills.map((s) => (
          <div key={s.key} className="space-y-1">
            <Label htmlFor={s.key}>{s.label}</Label>
            <Input id={s.key} name={s.key} {...scoreInput} />
          </div>
        ))}
        <div className="space-y-1">
          <Label htmlFor="source">From</Label>
          <Select id="source" name="source" defaultValue="official">
            <option value="official">The real test</option>
            <option value="official_practice">Official practice test</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="takenOn">Date taken</Label>
          <Input id="takenOn" name="takenOn" type="date" className="w-44" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {error ? (
          <p role="alert" className="w-full text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Panel>
  );
}
