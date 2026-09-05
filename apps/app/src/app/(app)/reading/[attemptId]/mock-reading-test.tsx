'use client';

import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { saveReadingAnswer, submitReadingAttempt } from '../actions';
import { ROMAN, TFNG, YNNG } from './reading-test';

type Props = {
  attemptId: string;
  startedAt: string;
  minutes: number;
  passages: {
    id: string;
    title: string;
    body: string;
    headings: string[] | null;
  }[];
  questions: RunnerQuestion[];
  /** Each passage keeps its own heading list — a plain object, not a `Map`, so it survives the server/client boundary. */
  headingsByQuestion: Record<string, string[] | null>;
  saved: RunnerSaved[];
};

/**
 * The mock's Reading section: 3 passages stacked in one left pane, one
 * 60-minute clock for all of them, free navigation between them via the same
 * `ExamNavigator` `ObjectiveRunner` already renders — it never needed to know
 * a question came from more than one passage.
 */
export function MockReadingTest({
  attemptId,
  startedAt,
  minutes,
  passages,
  questions,
  headingsByQuestion,
  saved,
}: Props) {
  const headingOptionsFor = (q: RunnerQuestion) => {
    const headings = headingsByQuestion[q.id];
    if (!headings?.length) return null;
    return headings.map((h, i) => ({
      value: h,
      label: `${ROMAN[i] ?? i + 1} — ${h}`,
    }));
  };

  return (
    <>
      <MockBlurBanner />
      <ObjectiveRunner
        attemptId={attemptId}
        splitId="mock-reading"
        left={
          <div className="space-y-12">
            {passages.map((p, i) => (
              <section key={p.id}>
                <p className="mb-1 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Passage {i + 1}
                </p>
                <h1 className="mb-6 font-title text-title">{p.title}</h1>
                {p.body.split(/\n\s*\n/).map((para, j) => (
                  <p
                    key={j}
                    className="mb-4 text-sm leading-7 whitespace-pre-line"
                  >
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>
        }
        optionsList={
          passages.some((p) => p.headings?.length) ? (
            <div className="mb-8 space-y-4">
              {passages.map((p, i) =>
                p.headings?.length ? (
                  <section key={p.id} className="border border-border p-4">
                    <h2 className="mb-3 font-title text-title">
                      Passage {i + 1} — list of headings
                    </h2>
                    <ol className="space-y-1.5">
                      {p.headings.map((h, j) => (
                        <li key={h} className="flex gap-3 text-sm">
                          <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                            {ROMAN[j] ?? j + 1}
                          </span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null,
              )}
            </div>
          ) : undefined
        }
        questions={questions}
        saved={saved}
        saveAction={saveReadingAnswer}
        submitAction={submitReadingAttempt}
        choicesFor={(q) =>
          q.kind === 'true_false_not_given'
            ? TFNG
            : q.kind === 'yes_no_not_given'
              ? YNNG
              : q.kind === 'multiple_choice'
                ? (q.options ?? null)
                : null
        }
        selectOptionsFor={(q) =>
          q.kind === 'matching_headings' ? headingOptionsFor(q) : null
        }
        timer={{ startedAt, minutes, autoSubmit: true }}
      />
    </>
  );
}
