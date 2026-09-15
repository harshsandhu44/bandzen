'use client';

import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { Passage } from '@/components/exam/passage';
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
 * The mock's Reading section: one 60-minute clock for every passage. The
 * runner pages through question blocks; the left pane shows whichever passage
 * the current block belongs to, and the `ExamNavigator` jumps freely across
 * all of them.
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
        module="reading"
        pageBy="group"
        left={(sectionId) => {
          const i = Math.max(
            0,
            passages.findIndex((p) => p.id === sectionId),
          );
          const p = passages[i];
          return (
            <section>
              <p className="mb-1 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                Passage {i + 1} of {passages.length}
              </p>
              <h1 className="mb-6 font-title text-title">{p.title}</h1>
              <Passage id={p.id} body={p.body} />
            </section>
          );
        }}
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
        highlightKey={`reading-highlights-${attemptId}`}
      />
    </>
  );
}
