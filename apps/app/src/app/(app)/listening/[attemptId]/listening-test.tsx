'use client';

import { useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { SaveStatus } from '@/components/app/save-status';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import type { Question } from '@/lib/db/schema';
import { useAutosave } from '@/lib/use-autosave';
import { saveListeningAnswer, submitListeningAttempt } from '../actions';

type Saved = { questionId: string; value: string | null; flagged: boolean };
type Q = Pick<Question, 'id' | 'idx' | 'kind' | 'prompt' | 'options'>;

type Props = {
  attemptId: string;
  track: { title: string; audioUrl: string; matchingOptions: string[] | null };
  questions: Q[];
  saved: Saved[];
};

const choicesFor = (q: Q) => (q.kind === 'multiple_choice' ? q.options : null);

/** Same navigator idiom as Reading — every tick is a real question. */
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

/**
 * A native `<audio>` with no `controls` attribute plays once with no pause,
 * rewind or scrub UI — real exam conditions, the same way Reading and Writing
 * never let a candidate pause their clock. Playback starts on a click rather
 * than `autoPlay`, since browsers block unmuted autoplay without a gesture;
 * that click also doubles as "I'm ready to begin".
 */
function Player({ audioUrl }: { audioUrl: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'ended'>('idle');

  const start = () => {
    setState('playing');
    ref.current?.play();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 border border-border p-10 text-center">
      <audio
        ref={ref}
        src={audioUrl}
        onEnded={() => setState('ended')}
        className="hidden"
      />
      {state === 'idle' ? (
        <Button type="button" onClick={start}>
          Start listening
        </Button>
      ) : (
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {state === 'playing' ? 'Playing — listen closely' : 'Audio finished'}
        </p>
      )}
      <p className="max-w-xs text-xs text-muted-foreground">
        Plays once, exactly as it does in the exam. There is no rewind, so
        answer as you listen.
      </p>
    </div>
  );
}

export function ListeningTest({ attemptId, track, questions, saved }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      saved.filter((s) => s.value).map((s) => [s.questionId, s.value!]),
    ),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.map((s) => [s.questionId, s.flagged])),
  );
  const { status, schedule, retryFailed } = useAutosave(saveListeningAnswer, {
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
            <SubmitConfirm
              action={submitListeningAttempt}
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
        <div className="border-border p-6 lg:min-h-0 lg:overflow-y-auto lg:border-r">
          <h1 className="mb-6 font-title text-title">{track.title}</h1>
          <Player audioUrl={track.audioUrl} />
        </div>

        <div className="p-6 lg:min-h-0 lg:overflow-y-auto">
          {track.matchingOptions?.length ? (
            <section className="mb-8 border border-border p-4">
              <h2 className="mb-3 font-title text-title">List of options</h2>
              <ol className="space-y-1.5">
                {track.matchingOptions.map((option, i) => (
                  <li key={option} className="flex gap-3 text-sm">
                    <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{option}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <ol>
            {questions.map((q) => {
              const choices = choicesFor(q);
              const isMatching = q.kind === 'matching';
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
                    {isMatching && track.matchingOptions?.length ? (
                      <select
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q, e.target.value)}
                        aria-label={`Option for question ${q.idx}`}
                        className="w-full max-w-sm border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <option value="">Choose an option…</option>
                        {track.matchingOptions.map((option, i) => (
                          <option key={option} value={option}>
                            {String.fromCharCode(65 + i)} — {option}
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
