'use client';

import { useRef, useState } from 'react';
import type { ClipboardEvent } from 'react';
import { cn } from '@bandzen/ui/lib/utils';
import type { WritingChartData } from '@bandzen/db/schema';
import { SaveStatus } from '@/components/app/save-status';
import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import { Timer } from '@/components/app/timer';
import { PromptChart } from '@/components/exam/prompt-chart';
import { useAutosave } from '@/lib/use-autosave';
import { saveEssayDraft, submitMockWriting } from '../actions';

const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const MIN_WORDS: Record<1 | 2, number> = { 1: 150, 2: 250 };

type Task = {
  attemptId: string;
  task: number;
  promptText: string;
  chartData: WritingChartData | null;
  body: string;
};

type Props = {
  startedAt: string;
  minutes: number;
  /** Null for a diagnostic — Task 2 only, and the tab strip collapses to one. */
  task1: Task | null;
  task2: Task;
};

/** Blocks paste/copy/cut — a sitting-only exam-condition guardrail. Standalone practice never sets this. */
function blockClipboard(e: ClipboardEvent<HTMLTextAreaElement>) {
  e.preventDefault();
}

export function MockWritingTest({ startedAt, minutes, task1, task2 }: Props) {
  // The tasks this sitting actually has: [1, 2] for a mock, [2] for a
  // diagnostic. The canonical submit row is Task 1's when there is one.
  const numbers = (task1 ? [1, 2] : [2]) as (1 | 2)[];
  const [active, setActive] = useState<1 | 2>(numbers[0]!);
  const [body1, setBody1] = useState(task1?.body ?? '');
  const [body2, setBody2] = useState(task2.body);
  const autoFormRef = useRef<HTMLFormElement>(null);
  const submitAttemptId = task1?.attemptId ?? task2.attemptId;

  const { status, schedule, retryFailed } = useAutosave(saveEssayDraft, {
    delay: 900,
  });

  const words1 = countWords(body1);
  const words2 = countWords(body2);
  const wordsFor = (n: 1 | 2) => (n === 1 ? words1 : words2);
  const activeTask =
    active === 1 && task1
      ? { task: task1, body: body1, words: words1, set: setBody1 }
      : { task: task2, body: body2, words: words2, set: setBody2 };

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10">
      <MockBlurBanner />
      <header className="sticky top-0 z-10 shrink-0 flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <div className="flex gap-1">
          {numbers.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setActive(n)}
              aria-pressed={active === n}
              className={cn(
                'border px-3 py-1.5 text-sm',
                active === n
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              Task {n}
              <span className="ml-2 font-metric text-metric-sm tabular-nums">
                {wordsFor(n)}
                <span className="text-current/60"> / {MIN_WORDS[n]}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <SaveStatus status={status} onRetry={retryFailed} />
          <Timer
            startedAt={startedAt}
            minutes={minutes}
            onExpire={() => autoFormRef.current?.requestSubmit()}
          />
          <SubmitConfirm
            action={submitMockWriting}
            attemptId={submitAttemptId}
            unsaved={status === 'failed'}
            disabled={words1 === 0 && words2 === 0}
            label="Submit"
          />
        </div>
      </header>

      <form ref={autoFormRef} action={submitMockWriting} className="hidden">
        <input type="hidden" name="attemptId" value={submitAttemptId} />
      </form>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <div className="border-l-2 border-chrome pl-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Task {activeTask.task.task}
          </p>
          <p className="mt-2 text-sm leading-7">{activeTask.task.promptText}</p>
        </div>

        {activeTask.task.chartData ? (
          <PromptChart data={activeTask.task.chartData} />
        ) : null}

        <textarea
          key={active}
          value={activeTask.body}
          onChange={(e) => {
            activeTask.set(e.target.value);
            schedule(`task${active}`, {
              attemptId: activeTask.task.attemptId,
              body: e.target.value,
              wordCount: countWords(e.target.value),
            });
          }}
          onPaste={blockClipboard}
          onCopy={blockClipboard}
          onCut={blockClipboard}
          aria-label={`Your response to Task ${activeTask.task.task}`}
          spellCheck={false}
          className="min-h-[24rem] flex-1 resize-none border border-input bg-transparent p-4 text-sm leading-7 focus-visible:outline-2 focus-visible:outline-ring"
        />

        {activeTask.words < MIN_WORDS[active] ? (
          <p className="text-xs text-muted-foreground">
            Under {MIN_WORDS[active]} words is penalised under Task Response.
          </p>
        ) : null}
      </div>
    </div>
  );
}
