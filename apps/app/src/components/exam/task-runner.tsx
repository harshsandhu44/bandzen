'use client';

import { useState } from 'react';
import type { TaskDefinition } from '@bandzen/exams/registry';
import { TaskShell } from '@/components/exam/task-shell';
import { RESPONSE_RENDERERS } from '@/components/exam/tasks/registry';
import { STIMULUS_RENDERERS } from '@/components/exam/tasks/stimuli';
import type { StimulusData, TaskItem } from '@/lib/task-content';
import { useAutosave } from '@/lib/use-autosave';

export type RunnerItem = {
  taskId: string;
  stimulus: StimulusData;
  item: TaskItem;
  value: string;
};

type SaveInput = { attemptId: string; taskId: string; value: string };

/**
 * One sitting of several items of a single task type, for any exam whose
 * content lives in `exam_tasks`.
 *
 * The task lab proved this shape against every task type of all four exams;
 * the difference here is that answers go to the database and the item set is
 * fixed by the attempt rather than by whatever the CMS holds right now.
 *
 * ponytail: `recording` and `conversation` answers are object URLs, which are
 * worthless once the tab closes, so they are not autosaved yet. #93 wires the
 * take to R2 and removes this guard.
 */
const UPLOADS_PENDING = new Set(['recording', 'conversation']);

export function TaskRunner({
  attemptId,
  task,
  items,
  startedAt,
  minutes,
  autoSubmit,
  saveAction,
  submitAction,
}: {
  attemptId: string;
  task: TaskDefinition;
  items: RunnerItem[];
  /** Issued by the server, so the clock renders the same on both sides. */
  startedAt: string;
  minutes: number | null;
  autoSubmit: boolean;
  saveAction: (input: SaveInput) => Promise<void>;
  submitAction: (formData: FormData) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.filter((i) => i.value).map((i) => [i.taskId, i.value]),
    ),
  );
  const [at, setAt] = useState(0);
  const { status, schedule, retryFailed } = useAutosave(saveAction);

  const Stimulus = STIMULUS_RENDERERS[task.stimulus];
  const Response = RESPONSE_RENDERERS[task.renderer];
  const current = items[at];
  if (!current) return null;

  const answered = items.filter((i) => answers[i.taskId]).length;

  const change = (taskId: string, value: string) => {
    setAnswers((a) => ({ ...a, [taskId]: value }));
    if (!UPLOADS_PENDING.has(task.renderer)) {
      schedule(taskId, { attemptId, taskId, value });
    }
  };

  return (
    <TaskShell
      attemptId={attemptId}
      splitId={`task-${task.key}`}
      left={
        <div className="space-y-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            {task.label}
          </p>
          {/* Keyed by item: a new stimulus is a new player, which is what
              stops a spent single-play audio from carrying over. */}
          <Stimulus
            key={current.taskId}
            data={current.stimulus}
            audio={task.audio}
          />
        </div>
      }
      right={
        <div className="space-y-6 p-6">
          <p className="text-sm">{current.item.prompt}</p>
          <Response
            key={current.taskId}
            id={current.taskId}
            label={task.label}
            item={current.item}
            value={answers[current.taskId] ?? ''}
            onChange={(v) => change(current.taskId, v)}
          />
        </div>
      }
      answered={answered}
      total={items.length}
      status={status}
      onRetry={retryFailed}
      timer={minutes == null ? undefined : { startedAt, minutes, autoSubmit }}
      navItems={items.map((i, n) => ({
        id: i.taskId,
        label: n + 1,
        answered: Boolean(answers[i.taskId]),
      }))}
      onJump={(id) => setAt(items.findIndex((i) => i.taskId === id))}
      submitAction={submitAction}
    />
  );
}
