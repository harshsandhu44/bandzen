'use client';

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Flag } from 'lucide-react';
import { Input } from '@bandzen/ui/components/input';
import { RadioCardGroup } from '@bandzen/ui/components/radio-card-group';
import { Select } from '@bandzen/ui/components/select';
import { useIsMobile } from '@bandzen/ui/hooks/use-mobile';
import { cn } from '@bandzen/ui/lib/utils';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@bandzen/ui/components/resizable';
import { SaveStatus } from '@/components/app/save-status';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import { Timer } from '@/components/app/timer';
import { ExamNavigator } from '@/components/exam/exam-navigator';
import type { Question } from '@/lib/db/schema';
import { useAutosave } from '@/lib/use-autosave';

export type RunnerQuestion = Pick<
  Question,
  'id' | 'idx' | 'kind' | 'prompt' | 'options'
>;
export type RunnerSaved = {
  questionId: string;
  value: string | null;
  flagged: boolean;
};

type SaveInput = {
  attemptId: string;
  questionId: string;
  value: string | null;
  flagged: boolean;
};

/**
 * The reading and listening runners were ~95% the same file. This is that
 * shared shell: a resizable split (passage / audio on the left, questions on
 * the right, ratio persisted), the shared `ExamNavigator` pinned to the
 * bottom, and answer controls that are real primitives — `RadioCardGroup`,
 * `Select`, `Input` — rather than hand-rolled `aria-pressed` rows.
 *
 * What differs between the two modules is passed in: the left pane, the
 * options list above the questions, and how a question's choices resolve.
 */
export function ObjectiveRunner({
  attemptId,
  splitId,
  left,
  optionsList,
  questions,
  saved,
  saveAction,
  submitAction,
  choicesFor,
  selectOptionsFor,
  timer,
}: {
  attemptId: string;
  /** localStorage key suffix for the divider position. */
  splitId: string;
  left: ReactNode;
  optionsList?: ReactNode;
  questions: RunnerQuestion[];
  saved: RunnerSaved[];
  saveAction: (input: SaveInput) => Promise<void>;
  submitAction: (formData: FormData) => void;
  /** Button-card choices for a question, or null when it is not that kind. */
  choicesFor: (q: RunnerQuestion) => readonly string[] | null;
  /** `{value,label}` options for a Select question, or null. */
  selectOptionsFor: (
    q: RunnerQuestion,
  ) => readonly { value: string; label: string }[] | null;
  /** Present for reading; absent for listening (no timer in the exam). */
  timer?: { startedAt: string; minutes: number; autoSubmit: boolean };
}) {
  const isMobile = useIsMobile();
  const splitKey = `runner-split-${splitId}`;
  const [splitLayout] = useState<Record<string, number> | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    try {
      const raw = window.localStorage.getItem(splitKey);
      return raw ? (JSON.parse(raw) as Record<string, number>) : undefined;
    } catch {
      return undefined;
    }
  });
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      saved.filter((s) => s.value).map((s) => [s.questionId, s.value!]),
    ),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.map((s) => [s.questionId, s.flagged])),
  );
  const [timeUp, setTimeUp] = useState(false);
  const autoFormRef = useRef<HTMLFormElement>(null);

  const { status, schedule, retryFailed } = useAutosave(saveAction, {
    delay: 700,
  });

  const persist = (
    questionId: string,
    value: string | undefined,
    flagged: boolean,
  ) =>
    schedule(questionId, {
      attemptId,
      questionId,
      value: value ?? null,
      flagged,
    });

  const setAnswer = (q: RunnerQuestion, value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    persist(q.id, value, flags[q.id] ?? false);
  };
  const toggleFlag = (q: RunnerQuestion) => {
    const next = !flags[q.id];
    setFlags((prev) => ({ ...prev, [q.id]: next }));
    persist(q.id, answers[q.id], next);
  };

  const answered = questions.filter((q) => answers[q.id]).length;

  const jump = useCallback((id: string, idx: number) => {
    void id;
    document.getElementById(`q-${idx}`)?.scrollIntoView({ block: 'start' });
  }, []);

  const navItems = questions.map((q) => ({
    id: q.id,
    label: q.idx,
    answered: Boolean(answers[q.id]),
    flagged: flags[q.id] ?? false,
  }));

  const questionsBody = (
    <div className="p-6">
      {optionsList}
      <ol>
        {questions.map((q) => (
          <li key={q.id} id={`q-${q.idx}`} className="mb-8 scroll-mt-6">
            <div className="mb-3 flex items-start gap-3">
              <span className="font-mono text-xs text-muted-foreground">
                {String(q.idx).padStart(2, '0')}
              </span>
              <p className="flex-1 text-sm">{q.prompt}</p>
              <button
                type="button"
                onClick={() => toggleFlag(q)}
                aria-pressed={flags[q.id] ?? false}
                aria-label={`Flag question ${q.idx}`}
                className={cn(
                  'shrink-0 p-1 text-muted-foreground hover:text-foreground',
                  flags[q.id] && 'text-chrome',
                )}
              >
                <Flag className="size-3.5" aria-hidden />
              </button>
            </div>

            <div className="ml-8">
              <AnswerField
                q={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswer(q, v)}
                choices={choicesFor(q)}
                selectOptions={selectOptionsFor(q)}
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10 lg:h-svh lg:min-h-0">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p className="font-metric text-metric-sm text-muted-foreground">
          {answered}/{questions.length} answered
        </p>
        <div className="flex items-center gap-4">
          <SaveStatus status={status} onRetry={retryFailed} />
          {timer ? (
            <Timer
              startedAt={timer.startedAt}
              minutes={timer.minutes}
              onExpire={() => {
                setTimeUp(true);
                if (timer.autoSubmit) autoFormRef.current?.requestSubmit();
              }}
            />
          ) : null}
        </div>
      </header>

      {timeUp && !timer?.autoSubmit ? (
        <p
          role="alert"
          className="shrink-0 border-b border-chrome bg-secondary/40 px-6 py-2 text-sm"
        >
          Time is up. In the real exam this attempt would end now — submit when
          you are ready.
        </p>
      ) : null}

      {isMobile ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="max-h-[42svh] shrink-0 overflow-y-auto border-b border-border p-6">
            {left}
          </div>
          <div className="flex-1 overflow-y-auto">{questionsBody}</div>
        </div>
      ) : (
        <ResizablePanelGroup
          id={`runner-${splitId}`}
          className="min-h-0 flex-1 overflow-hidden"
          defaultLayout={splitLayout}
          onLayoutChanged={(l) => {
            try {
              window.localStorage.setItem(splitKey, JSON.stringify(l));
            } catch {
              // A private window that refuses storage is not worth failing over.
            }
          }}
        >
          <ResizablePanel id="left" defaultSize="55" minSize="30">
            <div className="h-full overflow-y-auto p-6">{left}</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="right" minSize="30">
            <div className="h-full overflow-y-auto">{questionsBody}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ExamNavigator
        items={navItems}
        onJump={(id) => {
          const q = questions.find((x) => x.id === id);
          if (q) jump(id, q.idx);
        }}
        answeredCount={answered}
        total={questions.length}
      >
        <SubmitConfirm
          action={submitAction}
          attemptId={attemptId}
          unanswered={questions.length - answered}
          total={questions.length}
          unsaved={status === 'failed'}
        />
      </ExamNavigator>

      <form ref={autoFormRef} action={submitAction} className="hidden">
        <input type="hidden" name="attemptId" value={attemptId} />
      </form>
    </div>
  );
}

function AnswerField({
  q,
  value,
  onChange,
  choices,
  selectOptions,
}: {
  q: RunnerQuestion;
  value: string;
  onChange: (v: string) => void;
  choices: readonly string[] | null;
  selectOptions: readonly { value: string; label: string }[] | null;
}) {
  const cards = useMemo(
    () => choices?.map((c) => ({ value: c, label: c })) ?? null,
    [choices],
  );

  if (selectOptions) {
    return (
      <div className="max-w-sm">
        <Select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`Answer for question ${q.idx}`}
        >
          <option value="">Choose…</option>
          {selectOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    );
  }

  if (cards) {
    return (
      <RadioCardGroup
        legend={`Answer for question ${q.idx}`}
        cards={cards}
        value={value || null}
        onValueChange={onChange}
        columns={cards.length > 3 ? 2 : 3}
        className="[&_legend]:sr-only max-w-md"
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`Answer for question ${q.idx}`}
      className="max-w-xs font-mono"
    />
  );
}
