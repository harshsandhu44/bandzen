'use client';

import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Flag } from 'lucide-react';
import { ieltsQuestionTask } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { HighlightProvider, HighlightText } from '@/components/exam/highlights';
import { TaskShell } from '@/components/exam/task-shell';
import { RESPONSE_RENDERERS } from '@/components/exam/tasks/registry';
import type { Question } from '@/lib/db/schema';
import { groupQuestions, pageGroups } from '@/lib/question-groups';
import { useAutosave } from '@/lib/use-autosave';

export type RunnerQuestion = Pick<
  Question,
  'id' | 'idx' | 'kind' | 'prompt' | 'options'
> & {
  /** Passage or track id. Absent on a single-section practice attempt. */
  sectionId?: string;
};
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

const range = (from: number, to: number) =>
  from === to ? `Question ${from}` : `Questions ${from}–${to}`;

/**
 * The instruction line a real paper prints above each block of questions.
 * Reading only: listening tracks interleave kinds question by question, so
 * headers there would be one per question.
 */
const INSTRUCTIONS: Record<Question['kind'], string> = {
  true_false_not_given:
    'Do the statements agree with the information in the passage? Choose TRUE, FALSE or NOT GIVEN.',
  yes_no_not_given:
    'Do the statements agree with the views of the writer? Choose YES, NO or NOT GIVEN.',
  multiple_choice: 'Choose the correct answer.',
  matching_headings:
    'Choose the correct heading for each paragraph from the list below.',
  matching: 'Choose the correct option for each question from the list below.',
  sentence_completion:
    'Complete the sentences with words from the passage. The word limit is given after each one.',
};

/**
 * IELTS Reading and Listening on the shared `TaskShell`. Each question row
 * resolves to its IELTS task definition, and the definition's renderer draws
 * the answer control — this file owns only IELTS's paper layout.
 *
 * What differs between the two modules is passed in: the left pane and how a
 * question's choices resolve. Questions render in the paper's blocks
 * ("Questions 1–4" + instructions, see `groupQuestions`); Reading pages
 * through one block at a time, Listening shows a whole recording's blocks.
 */
export function ObjectiveRunner({
  attemptId,
  splitId,
  module,
  pageBy,
  sectionId,
  left,
  questions,
  saved,
  saveAction,
  submitAction,
  choicesFor,
  selectOptionsFor,
  timer,
  highlightKey,
}: {
  attemptId: string;
  /** localStorage key suffix for the divider position. */
  splitId: string;
  /** Reading gets block headers + instructions; listening does not. */
  module: 'reading' | 'listening';
  /** One block per page, or one passage/track (all its blocks) per page. */
  pageBy: 'group' | 'section';
  /** Set by the parent to move the view to that passage/track's first page. */
  sectionId?: string;
  /** A function receives the current page's passage/track id. */
  left: ReactNode | ((sectionId: string) => ReactNode);
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
  /** localStorage key for passage/prompt highlights; absent = not highlightable. */
  highlightKey?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      saved.filter((s) => s.value).map((s) => [s.questionId, s.value!]),
    ),
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(saved.map((s) => [s.questionId, s.flagged])),
  );
  const leftRef = useRef<HTMLDivElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);

  const pages = useMemo(
    () => pageGroups(groupQuestions(questions), pageBy),
    [questions, pageBy],
  );
  const pageOfSection = (id: string | undefined) =>
    Math.max(
      0,
      pages.findIndex((p) => p[0].sectionId === (id ?? '')),
    );
  const [page, setPage] = useState(() => pageOfSection(sectionId));
  const currentSection = pages[page]?.[0].sectionId ?? '';

  const goTo = (next: number, scrollToId?: string) => {
    if (pages[next]?.[0].sectionId !== currentSection) {
      leftRef.current?.scrollTo({ top: 0 });
    }
    setPage(next);
    // Scroll the questions pane only — `scrollIntoView` would also scroll the
    // window when a short page can't fill the pane, shoving the header away.
    requestAnimationFrame(() => {
      const pane = questionsRef.current?.parentElement;
      const target = scrollToId && document.getElementById(scrollToId);
      if (!pane) return;
      pane.scrollTo({
        top: target
          ? target.getBoundingClientRect().top -
            pane.getBoundingClientRect().top +
            pane.scrollTop -
            24
          : 0,
      });
    });
  };

  // The parent moved on (Listening's "Next recording"): follow it. Adjusting
  // state during render rather than in an effect, so there is no stale frame.
  const [prevSectionId, setPrevSectionId] = useState(sectionId);
  if (sectionId !== prevSectionId) {
    setPrevSectionId(sectionId);
    setPage(pageOfSection(sectionId));
  }

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

  const navItems = questions.map((q) => ({
    id: q.id,
    label: q.idx,
    answered: Boolean(answers[q.id]),
    flagged: flags[q.id] ?? false,
  }));

  const pageGroupsNow = pages[page] ?? [];
  const questionsBody = (
    <div ref={questionsRef} className="p-6">
      {pageGroupsNow.map((group, i) => {
        const headed = module === 'reading';
        // Headerless listening shows a track's option list once, not per block.
        const listed =
          (group.kind === 'matching_headings' || group.kind === 'matching') &&
          (headed ||
            pageGroupsNow.findIndex((g) => g.kind === group.kind) === i)
            ? selectOptionsFor(group.questions[0])
            : null;
        return (
          <section
            key={group.questions[0].id}
            className={cn(headed && 'mb-10')}
          >
            {headed ? (
              <>
                <h2 className="font-title text-title">
                  {range(group.from, group.to)}
                </h2>
                <p className="mt-1 mb-6 text-sm text-muted-foreground text-pretty">
                  {INSTRUCTIONS[group.kind]}
                </p>
              </>
            ) : null}

            {listed?.length ? (
              <ol className="mb-8 space-y-1.5 border border-border p-4">
                {listed.map((o) => (
                  <li key={o.value} className="text-sm">
                    {o.label}
                  </li>
                ))}
              </ol>
            ) : null}

            <ol>
              {group.questions.map((q) => (
                <li key={q.id} id={`q-${q.idx}`} className="mb-8 scroll-mt-6">
                  <div className="mb-3 flex items-start gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {String(q.idx).padStart(2, '0')}
                    </span>
                    {highlightKey ? (
                      <HighlightText
                        id={`q:${q.id}`}
                        text={q.prompt}
                        className="flex-1 text-sm"
                      />
                    ) : (
                      <p className="flex-1 text-sm">{q.prompt}</p>
                    )}
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
                      module={module}
                      value={answers[q.id] ?? ''}
                      onChange={(v) => setAnswer(q, v)}
                      choices={choicesFor(q)}
                      selectOptions={selectOptionsFor(q)}
                    />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      {pageBy === 'group' && pages.length > 1 ? (
        <div className="flex flex-wrap justify-between gap-3">
          {page > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goTo(page - 1)}
            >
              <ArrowLeft aria-hidden />
              {range(pages[page - 1][0].from, pages[page - 1][0].to)}
            </Button>
          ) : (
            <span />
          )}
          {page < pages.length - 1 ? (
            <Button type="button" size="sm" onClick={() => goTo(page + 1)}>
              {range(pages[page + 1][0].from, pages[page + 1][0].to)}
              <ArrowRight aria-hidden />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const leftBody = typeof left === 'function' ? left(currentSection) : left;

  const runner = (
    <TaskShell
      attemptId={attemptId}
      splitId={splitId}
      left={leftBody}
      right={questionsBody}
      leftRef={leftRef}
      answered={answered}
      total={questions.length}
      status={status}
      onRetry={retryFailed}
      timer={timer}
      navItems={navItems}
      onJump={(id) => {
        const i = pages.findIndex((p) =>
          p.some((g) => g.questions.some((x) => x.id === id)),
        );
        const q = questions.find((x) => x.id === id);
        if (i >= 0 && q) goTo(i, `q-${q.idx}`);
      }}
      submitAction={submitAction}
    />
  );

  return highlightKey ? (
    <HighlightProvider storageKey={highlightKey}>{runner}</HighlightProvider>
  ) : (
    runner
  );
}

function AnswerField({
  q,
  module,
  value,
  onChange,
  choices,
  selectOptions,
}: {
  q: RunnerQuestion;
  module: 'reading' | 'listening';
  value: string;
  onChange: (v: string) => void;
  choices: readonly string[] | null;
  selectOptions: readonly { value: string; label: string }[] | null;
}) {
  const Response =
    RESPONSE_RENDERERS[ieltsQuestionTask(module, q.kind).renderer];
  return (
    <Response
      id={q.id}
      label={`Answer for question ${q.idx}`}
      item={{
        prompt: q.prompt,
        options: selectOptions ?? choices?.map((c) => ({ value: c, label: c })),
      }}
      value={value}
      onChange={onChange}
    />
  );
}
