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
      module="reading"
      pageBy="group"
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
