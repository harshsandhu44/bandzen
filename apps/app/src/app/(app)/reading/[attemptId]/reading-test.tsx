'use client';

import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { saveReadingAnswer, submitReadingAttempt } from '../actions';

export const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
export const YNNG = ['YES', 'NO', 'NOT GIVEN'];

/** Roman numerals, the way a real paper labels its heading list. */
export const ROMAN = [
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

type Props = {
  attemptId: string;
  startedAt: string;
  minutes: number;
  /** Diagnostic and mock attempts auto-submit at 0:00; practice only warns. */
  autoSubmit: boolean;
  passage: { title: string; body: string };
  headings: string[] | null;
  questions: RunnerQuestion[];
  saved: RunnerSaved[];
};

export function ReadingTest({
  attemptId,
  startedAt,
  minutes,
  autoSubmit,
  passage,
  headings,
  questions,
  saved,
}: Props) {
  const headingOptions =
    headings?.map((h, i) => ({
      value: h,
      label: `${ROMAN[i] ?? i + 1} — ${h}`,
    })) ?? null;

  return (
    <ObjectiveRunner
      attemptId={attemptId}
      splitId="reading"
      left={
        <>
          <h1 className="mb-6 font-title text-title">{passage.title}</h1>
          {passage.body.split(/\n\s*\n/).map((para, i) => (
            <p key={i} className="mb-4 text-sm leading-7 whitespace-pre-line">
              {para}
            </p>
          ))}
        </>
      }
      optionsList={
        headings?.length ? (
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
        q.kind === 'matching_headings' ? headingOptions : null
      }
      timer={{ startedAt, minutes, autoSubmit }}
    />
  );
}
