'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { cn } from '@bandzen/ui/lib/utils';
import { SaveStatus } from '@/components/app/save-status';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import type { Question } from '@/lib/db/schema';
import { useAutosave } from '@/lib/use-autosave';
import { saveReadingAnswer, submitReadingAttempt } from '../actions';
import { Timer } from './timer';

const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG = ['YES', 'NO', 'NOT GIVEN'];

type Saved = { questionId: string; value: string | null; flagged: boolean };
type Q = Pick<Question, 'id' | 'idx' | 'kind' | 'prompt' | 'options'>;

type Props = {
  attemptId: string;
  startedAt: string;
  minutes: number;
  passage: { title: string; body: string };
  /** Shared list for every matching_headings question, or null. */
  headings: string[] | null;
  questions: Q[];
  saved: Saved[];
};

/** Roman numerals, the way a real paper labels its heading list. */
const ROMAN = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
];

const choicesFor = (q: Q) =>
  q.kind === 'true_false_not_given'
    ? TFNG
    : q.kind === 'yes_no_not_given'
      ? YNNG
      : (q.options ?? null);

export function ReadingTest({
  attemptId,
  startedAt,
  minutes,
  passage,
  headings,
  questions,
  saved,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      saved.filter((s) => s.value).map((s) => [s.questionId, s.value!]),
    ),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.map((s) => [s.questionId, s.flagged])),
  );
  // Debounced per question. A failed save is retried rather than swallowed --
  // losing an answer silently is the worst thing this screen can do.
  const { status, schedule, retryFailed } = useAutosave(saveReadingAnswer, {
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

  const setAnswer = (q: Q, value: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: value }));
    persist(q.id, value, flags[q.id] ?? false);
  };

  const toggleFlag = (q: Q) => {
    const next = !flags[q.id];
    setFlags((prev) => ({ ...prev, [q.id]: next }));
    persist(q.id, answers[q.id], next);
  };

  const answered = questions.filter((q) => answers[q.id]).length;

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {answered}/{questions.length} answered
        </p>
        <div className="flex items-center gap-4">
          <SaveStatus status={status} onRetry={retryFailed} />
          <Timer startedAt={startedAt} minutes={minutes} />
          <SubmitConfirm
            action={submitReadingAttempt}
            attemptId={attemptId}
            unanswered={questions.length - answered}
            total={questions.length}
            unsaved={status === 'failed'}
          />
        </div>
      </header>

      <div className="grid flex-1 gap-0 lg:grid-cols-2">
        <article className="overflow-y-auto border-border p-6 lg:max-h-[calc(100svh-3.5rem)] lg:border-r">
          <h1 className="mb-6 text-xl font-medium tracking-tight">
            {passage.title}
          </h1>
          {passage.body.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="mb-4 text-sm leading-7 whitespace-pre-line">
              {para}
            </p>
          ))}
        </article>

        <div className="overflow-y-auto p-6 lg:max-h-[calc(100svh-3.5rem)]">
          {headings?.length ? (
            <section className="mb-8 border border-border p-4">
              <h2 className="mb-3 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                List of headings
              </h2>
              <ol className="space-y-1.5">
                {headings.map((h, i) => (
                  <li key={h} className="flex gap-3 text-sm">
                    <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                      {ROMAN[i] ?? i + 1}
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <ol>
            {questions.map((q) => {
              const choices = choicesFor(q);
              const isHeading = q.kind === 'matching_headings';
              return (
                <li key={q.id} className="mb-8">
                  <div className="mb-2 flex items-start gap-3">
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
                    {isHeading && headings?.length ? (
                      <select
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q, e.target.value)}
                        aria-label={`Heading for question ${q.idx}`}
                        className="w-full max-w-sm border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <option value="">Choose a heading…</option>
                        {headings.map((h, i) => (
                          <option key={h} value={h}>
                            {ROMAN[i] ?? i + 1} — {h}
                          </option>
                        ))}
                      </select>
                    ) : choices ? (
                      <div className="flex flex-wrap gap-2">
                        {choices.map((choice) => (
                          <button
                            key={choice}
                            type="button"
                            onClick={() => setAnswer(q, choice)}
                            aria-pressed={answers[q.id] === choice}
                            className={cn(
                              'border border-border px-3 py-1.5 font-mono text-xs tracking-wide transition-colors',
                              answers[q.id] === choice
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'hover:bg-secondary',
                            )}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q, e.target.value)}
                        aria-label={`Answer for question ${q.idx}`}
                        className="w-full max-w-xs border border-input bg-transparent px-3 py-1.5 font-mono text-sm focus-visible:outline-2 focus-visible:outline-ring"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
