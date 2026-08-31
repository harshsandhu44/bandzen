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

/**
 * The question navigator.
 *
 * apps/web has advertised this since launch (see marketing/exam-window.tsx)
 * and the real exam screen never had it, so a candidate could not see which
 * questions were still blank without scrolling the whole column.
 *
 * The band scale's idiom applied to something that encodes real state: each
 * tick IS a question. Colour is never the only channel -- a flag carries the
 * glyph, and every cell names its own state.
 */
function Navigator({
  questions,
  answers,
  flags,
}: {
  questions: Q[];
  answers: Record<string, string>;
  flags: Record<string, boolean>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <ul className="flex flex-1 flex-wrap gap-1">
        {questions.map((q) => {
          const flagged = flags[q.id] ?? false;
          const answered = Boolean(answers[q.id]);
          const state = flagged
            ? 'flagged'
            : answered
              ? 'answered'
              : 'not answered';
          return (
            <li key={q.id}>
              <a
                href={`#q-${q.idx}`}
                aria-label={`Question ${q.idx}, ${state}`}
                className={cn(
                  'flex size-6 items-center justify-center border font-mono text-[0.5rem] tabular-nums transition-colors',
                  flagged
                    ? 'border-chrome bg-chrome text-ink'
                    : answered
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:border-foreground/40',
                )}
              >
                {flagged ? <Flag className="size-2.5" aria-hidden /> : q.idx}
              </a>
            </li>
          );
        })}
      </ul>

      <p className="flex shrink-0 items-center gap-3 font-mono text-[0.5625rem] tracking-[0.14em] text-muted-foreground uppercase">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 bg-primary" />
          Answered
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 bg-chrome" />
          Flagged
        </span>
      </p>
    </div>
  );
}

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
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10 lg:h-svh lg:min-h-0">
      <header className="sticky top-0 z-10 shrink-0 space-y-3 border-b border-border bg-background px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <p className="font-metric text-metric-sm text-muted-foreground">
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
        </div>

        <Navigator questions={questions} answers={answers} flags={flags} />
      </header>

      <div className="grid flex-1 gap-0 lg:min-h-0 lg:grid-cols-2">
        <article className="border-border p-6 lg:min-h-0 lg:overflow-y-auto lg:border-r">
          <h1 className="mb-6 font-title text-title">{passage.title}</h1>
          {passage.body.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="mb-4 text-sm leading-7 whitespace-pre-line">
              {para}
            </p>
          ))}
        </article>

        <div className="p-6 lg:min-h-0 lg:overflow-y-auto">
          {headings?.length ? (
            <section className="mb-8 border border-border p-4">
              <h2 className="mb-3 font-title text-title">List of headings</h2>
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
                <li key={q.id} id={`q-${q.idx}`} className="mb-8 scroll-mt-6">
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
