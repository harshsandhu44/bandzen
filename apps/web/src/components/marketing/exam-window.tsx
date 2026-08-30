import { Flag } from 'lucide-react';

import { cn } from '@bandzen/ui/lib/utils';

import { mockTest } from '@/content/sections';

const QUESTIONS = Array.from(
  { length: mockTest.progress.total },
  (_, i) => i + 1,
);

/** The exam interface, rebuilt as real markup rather than a screenshot. */
export function ExamWindow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'border-paper/15 bg-paper text-ink overflow-clip border shadow-2xl',
        className,
      )}
    >
      {/* Browser chrome */}
      <div className="border-border bg-secondary flex items-center gap-2 border-b px-4 py-2.5">
        <span className="bg-border size-2.5 rounded-full" />
        <span className="bg-border size-2.5 rounded-full" />
        <span className="bg-border size-2.5 rounded-full" />
        <span className="text-slate mx-auto font-mono text-[0.625rem] tracking-[0.14em] uppercase">
          Academic · Reading
        </span>
      </div>

      {/* Exam bar */}
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <span className="font-mono text-[0.625rem] tracking-[0.18em] uppercase">
          {mockTest.passage}
        </span>
        <span className="border-ink flex items-center gap-2 border px-2.5 py-1 font-mono text-sm tabular-nums">
          <span className="bg-destructive size-1.5 rounded-full" />
          {mockTest.timer}
        </span>
      </div>

      <div className="grid gap-0 sm:grid-cols-5">
        {/* Passage */}
        <div className="border-border p-4 sm:col-span-3 sm:border-r">
          <p className="text-slate font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
            Passage
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {[100, 94, 98, 88, 96, 72].map((w, i) => (
              <span
                key={i}
                className="bg-border block h-1.5"
                style={{ width: `${w}%` }}
                aria-hidden
              />
            ))}
            <span className="bg-chrome mt-1 block h-1.5 w-[64%]" aria-hidden />
          </div>
          <p className="sr-only">
            A reading passage, with the sentence containing the answer
            highlighted.
          </p>
        </div>

        {/* Navigator */}
        <div className="p-4 sm:col-span-2">
          <div className="flex items-baseline justify-between">
            <p className="text-slate font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
              Navigator
            </p>
            <p className="font-mono text-[0.625rem] tabular-nums">
              {mockTest.progress.answered}/{mockTest.progress.total}
            </p>
          </div>

          <ul className="mt-3 grid grid-cols-8 gap-1">
            {QUESTIONS.map((n) => {
              const answered = n <= mockTest.progress.answered;
              const flagged = (
                mockTest.progress.flagged as readonly number[]
              ).includes(n);
              return (
                <li
                  key={n}
                  className={cn(
                    'relative flex aspect-square items-center justify-center font-mono text-[0.5rem] tabular-nums',
                    flagged
                      ? 'bg-chrome text-ink'
                      : answered
                        ? 'bg-cobalt text-paper'
                        : 'border-border text-slate border',
                  )}
                >
                  {flagged ? <Flag className="size-2" aria-hidden /> : n}
                </li>
              );
            })}
          </ul>

          <p className="text-slate mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.5rem] tracking-[0.12em] uppercase">
            <span className="flex items-center gap-1">
              <span className="bg-cobalt size-2" /> Answered
            </span>
            <span className="flex items-center gap-1">
              <span className="bg-chrome size-2" /> Flagged
            </span>
          </p>
        </div>
      </div>

      {/* Section progress */}
      <div className="border-border bg-secondary border-t px-4 py-3">
        <div className="bg-border relative h-1">
          <div
            className="bg-cobalt absolute inset-y-0 left-0"
            style={{
              width: `${(mockTest.progress.answered / mockTest.progress.total) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
