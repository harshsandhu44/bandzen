'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import type { Question } from '@/lib/db/schema';
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
  const [saving, setSaving] = useState(false);

  // Debounced per question. Each save is a server action now that the browser
  // holds no database credentials, so the debounce is what keeps this to about
  // one request per second rather than one per keystroke.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const persist = useCallback(
    (questionId: string, value: string | undefined, flagged: boolean) => {
      clearTimeout(timers.current[questionId]);
      setSaving(true);
      timers.current[questionId] = setTimeout(() => {
        void saveReadingAnswer({
          attemptId,
          questionId,
          value: value ?? null,
          flagged,
        })
          .catch(() => {})
          .finally(() => setSaving(false));
      }, 700);
    },
    [attemptId],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of Object.values(pending)) clearTimeout(t);
    };
  }, []);

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
          {saving ? ' · saving…' : ''}
        </p>
        <div className="flex items-center gap-4">
          <Timer startedAt={startedAt} minutes={minutes} />
          <form action={submitReadingAttempt}>
            <input type="hidden" name="attemptId" value={attemptId} />
            <Button type="submit" size="sm">
              Submit
            </Button>
          </form>
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
