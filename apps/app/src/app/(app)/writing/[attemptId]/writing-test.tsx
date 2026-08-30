'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { Timer } from '../../reading/[attemptId]/timer';
import { saveEssayDraft, submitEssay } from '../actions';

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

type Props = {
  attemptId: string;
  startedAt: string;
  minutes: number;
  minWords: number;
  task: number;
  promptText: string;
  initialBody: string;
};

export function WritingTest({
  attemptId,
  startedAt,
  minutes,
  minWords,
  task,
  promptText,
  initialBody,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const words = countWords(body);
  const short = words < minWords;

  const persist = useCallback(
    (next: string) => {
      clearTimeout(timer.current);
      setSaving(true);
      timer.current = setTimeout(() => {
        void saveEssayDraft({
          attemptId,
          body: next,
          wordCount: countWords(next),
        })
          .catch(() => {})
          .finally(() => setSaving(false));
      }, 900);
    },
    [attemptId],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p
          className={cn(
            'font-metric text-metric-sm',
            short ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {words}
          <span className="text-muted-foreground"> / {minWords} words</span>
          {saving ? (
            <span className="text-muted-foreground"> · saving…</span>
          ) : null}
        </p>
        <div className="flex items-center gap-4">
          <Timer startedAt={startedAt} minutes={minutes} />
          <form action={submitEssay}>
            <input type="hidden" name="attemptId" value={attemptId} />
            <Button type="submit" size="sm" disabled={words === 0}>
              Submit
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <div className="border-l-2 border-chrome pl-4">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Task {task}
          </p>
          <p className="mt-2 text-sm leading-7">{promptText}</p>
        </div>

        {/* Deliberately plain. This is the screen where the app's furniture
            is most harmful to the person using it. */}
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            persist(e.target.value);
          }}
          aria-label="Your response"
          spellCheck={false}
          className="min-h-[24rem] flex-1 resize-none border border-input bg-transparent p-4 text-sm leading-7 focus-visible:outline-2 focus-visible:outline-ring"
        />

        {short ? (
          <p className="font-mono text-xs text-muted-foreground">
            Under {minWords} words is penalised under Task Response.
          </p>
        ) : null}
      </div>
    </div>
  );
}
