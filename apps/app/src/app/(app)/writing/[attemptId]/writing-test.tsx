'use client';

import { useRef, useState } from 'react';
import { cn } from '@bandzen/ui/lib/utils';
import { SaveStatus } from '@/components/app/save-status';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import { useAutosave } from '@/lib/use-autosave';
import { Timer } from '@/components/app/timer';
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
  /** Diagnostic and mock attempts auto-submit at 0:00; practice only warns. */
  autoSubmit: boolean;
};

export function WritingTest({
  attemptId,
  startedAt,
  minutes,
  minWords,
  task,
  promptText,
  initialBody,
  autoSubmit,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [timeUp, setTimeUp] = useState(false);
  const autoFormRef = useRef<HTMLFormElement>(null);

  // One key, because there is only one draft -- but the retry and the failure
  // state matter more here than anywhere: this is forty minutes of writing.
  const { status, schedule, retryFailed } = useAutosave(saveEssayDraft, {
    delay: 900,
  });

  const words = countWords(body);
  const short = words < minWords;

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10">
      <header className="sticky top-0 z-10 shrink-0 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p
          className={cn(
            'font-metric text-metric-sm',
            short ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {words}
          <span className="text-muted-foreground"> / {minWords} words</span>
        </p>
        <div className="flex items-center gap-4">
          <SaveStatus status={status} onRetry={retryFailed} />
          <Timer
            startedAt={startedAt}
            minutes={minutes}
            onExpire={() => {
              setTimeUp(true);
              if (autoSubmit) autoFormRef.current?.requestSubmit();
            }}
          />
          <SubmitConfirm
            action={submitEssay}
            attemptId={attemptId}
            unsaved={status === 'failed'}
            disabled={words === 0}
            label="Submit"
          />
        </div>
      </header>

      {timeUp && !autoSubmit ? (
        <p
          role="alert"
          className="shrink-0 border-b border-chrome bg-secondary/40 px-6 py-2 text-sm"
        >
          Time is up. In the real exam this attempt would end now — submit when
          you are ready.
        </p>
      ) : null}

      <form ref={autoFormRef} action={submitEssay} className="hidden">
        <input type="hidden" name="attemptId" value={attemptId} />
      </form>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <div className="border-l-2 border-chrome pl-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
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
            schedule('essay', {
              attemptId,
              body: e.target.value,
              wordCount: countWords(e.target.value),
            });
          }}
          aria-label="Your response"
          spellCheck={false}
          className="min-h-[24rem] flex-1 resize-none border border-input bg-transparent p-4 text-sm leading-7 focus-visible:outline-2 focus-visible:outline-ring"
        />

        {short ? (
          <p className="text-xs text-muted-foreground">
            Under {minWords} words is penalised under Task Response.
          </p>
        ) : null}
      </div>
    </div>
  );
}
