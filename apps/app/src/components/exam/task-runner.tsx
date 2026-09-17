'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { TaskDefinition } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';
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
  /** The stimulus already began on an earlier visit: its one play is used. */
  stimulusStarted?: boolean;
  /** A mock recording left mid-task on an earlier visit: no second go. */
  spent?: boolean;
};

type SaveInput = { attemptId: string; taskId: string; value: string };
type ItemInput = { attemptId: string; taskId: string };

/**
 * One sitting of several items of a single task type, for any exam whose
 * content lives in `exam_tasks`.
 *
 * Two modes, chosen explicitly by the page and never inferred here:
 *
 * - `practice` — the candidate moves freely between items, and a single-play
 *   recording counts its plays in the browser.
 * - `mock` — the real format's rules. Items are taken in order with no way
 *   back; each stimulus is stamped on the server the moment it begins, so a
 *   remount or reload cannot replay it; and a spoken answer starts when the
 *   stimulus finishes, not when the candidate decides to.
 *
 * A recording persists through its own upload, which writes `audio_url`
 * directly, so its answer is not sent through autosave as well — the URL is
 * already stored by the time the renderer reports it.
 */
export function TaskRunner({
  attemptId,
  task,
  items,
  mode,
  initialAt,
  timer,
  autoSubmit,
  saveAction,
  uploadAction,
  stimulusAction,
  stepAction,
  submitAction,
}: {
  attemptId: string;
  task: TaskDefinition;
  items: RunnerItem[];
  mode: 'mock' | 'practice';
  /** Where to start: a mock resumes at the first item not yet moved past. */
  initialAt: number;
  /** Issued by the server, so the clock renders the same on both sides. */
  timer: { startedAt: string; minutes: number } | null;
  autoSubmit: boolean;
  saveAction: (input: SaveInput) => Promise<void>;
  /** Stores a recorded take. Absent for task types that never record one. */
  uploadAction?: (
    formData: FormData,
  ) => Promise<{ ok: boolean; url: string | null }>;
  stimulusAction: (input: ItemInput) => Promise<void>;
  stepAction: (input: ItemInput) => Promise<void>;
  submitAction: (formData: FormData) => void;
}) {
  const mock = mode === 'mock';
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      items.filter((i) => i.value).map((i) => [i.taskId, i.value]),
    ),
  );
  const [at, setAt] = useState(initialAt);
  // Items whose audio has finished playing, so a mock spoken answer knows
  // when to begin. An item with no audio is ready as soon as it is shown.
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [stepping, setStepping] = useState(false);
  const { status, schedule, retryFailed, flushAll } = useAutosave(saveAction);

  const Stimulus = STIMULUS_RENDERERS[task.stimulus];
  const Response = RESPONSE_RENDERERS[task.renderer];
  const current = items[at];

  // A mock item with nothing to play begins when it is shown. The server
  // stamps the first item of a page load; this covers moving on to the next.
  const currentId = current?.taskId;
  const hasAudio = Boolean(current?.stimulus.audioUrl);
  useEffect(() => {
    if (!mock || !currentId || hasAudio) return;
    void stimulusAction({ attemptId, taskId: currentId });
  }, [mock, currentId, hasAudio, attemptId, stimulusAction]);

  if (!current) return null;

  const answered = items.filter((i) => answers[i.taskId]).length;
  const last = at === items.length - 1;

  const change = (taskId: string, value: string) => {
    setAnswers((a) => ({ ...a, [taskId]: value }));
    if (task.renderer !== 'recording') {
      schedule(taskId, { attemptId, taskId, value });
    }
  };

  const upload = async (taskId: string, blob: Blob) => {
    if (!uploadAction) return null;
    const fd = new FormData();
    fd.set('attemptId', attemptId);
    fd.set('taskId', taskId);
    fd.set('audio', new File([blob], 'take.wav', { type: 'audio/wav' }));
    const result = await uploadAction(fd);
    return result.ok ? result.url : null;
  };

  // Save what is typed, close the item on the server, then move on. Closing
  // first is what makes going back impossible rather than merely hidden.
  const next = async () => {
    setStepping(true);
    try {
      await flushAll();
      await stepAction({ attemptId, taskId: current.taskId });
      setAt((n) => n + 1);
    } finally {
      setStepping(false);
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
          {/* Keyed by item: a new stimulus is a new player. In a mock the
              played state comes from the server, so remounting cannot reset
              it; in practice the key alone does the job. */}
          <Stimulus
            key={current.taskId}
            data={current.stimulus}
            audio={task.audio}
            alreadyPlayed={mock && current.stimulusStarted}
            onStart={
              mock
                ? () =>
                    void stimulusAction({ attemptId, taskId: current.taskId })
                : undefined
            }
            onEnded={() => setReady((r) => ({ ...r, [current.taskId]: true }))}
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
            onUpload={
              uploadAction ? (blob) => upload(current.taskId, blob) : undefined
            }
            auto={
              mock
                ? {
                    // A played-out recording from an earlier visit still
                    // counts as finished, so the answer is not held forever.
                    ready:
                      !current.stimulus.audioUrl ||
                      Boolean(ready[current.taskId]) ||
                      Boolean(current.stimulusStarted),
                    spent: Boolean(current.spent),
                  }
                : undefined
            }
          />
        </div>
      }
      answered={answered}
      total={items.length}
      status={status}
      onRetry={retryFailed}
      timer={timer ? { ...timer, autoSubmit } : undefined}
      beforeSubmit={flushAll}
      navItems={items.map((i, n) => ({
        id: i.taskId,
        label: n + 1,
        answered: Boolean(answers[i.taskId]),
      }))}
      currentId={current.taskId}
      locked={mock}
      // Not just a disabled control in a mock: there is no way back at all.
      onJump={(id) => {
        if (!mock) setAt(items.findIndex((i) => i.taskId === id));
      }}
      step={
        mock && !last ? (
          <Button type="button" onClick={next} disabled={stepping}>
            Next <ArrowRight />
          </Button>
        ) : undefined
      }
      submitAction={submitAction}
    />
  );
}
