'use client';

import { useState } from 'react';
import type { TaskDefinition } from '@bandzen/exams/registry';
import { TaskShell } from '@/components/exam/task-shell';
import { RESPONSE_RENDERERS } from '@/components/exam/tasks/registry';
import { STIMULUS_RENDERERS } from '@/components/exam/tasks/stimuli';
import type { StimulusData, TaskItem } from '@/lib/task-content';
import { useAutosave } from '@/lib/use-autosave';

// Autosave runs for real so its status UI is exercised; there is nowhere to save to.
const saveNowhere = async () => {};

/** One sample task in the real exam shell. State lives in this tab only. */
export function TaskLab({
  examName,
  source,
  task,
  stimulus,
  item,
  minutes,
  startedAt,
}: {
  examName: string;
  /** Whether this is a real published item or placeholder content. */
  source: string;
  task: TaskDefinition;
  stimulus: StimulusData;
  item: TaskItem;
  minutes: number | null;
  /** Issued by the server, so the clock renders the same on both sides. */
  startedAt: string;
}) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { status, schedule, retryFailed } = useAutosave(saveNowhere);

  const Stimulus = STIMULUS_RENDERERS[task.stimulus];
  const Response = RESPONSE_RENDERERS[task.renderer];

  return (
    <TaskShell
      attemptId={`lab-${task.key}`}
      splitId={`lab-${task.key}`}
      left={
        <div className="space-y-4">
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            {examName} · {task.label} · {task.measuredSkills.join(' + ')} ·{' '}
            {source}
          </p>
          <Stimulus data={stimulus} />
        </div>
      }
      right={
        <div className="space-y-6 p-6">
          <p className="text-sm">{item.prompt}</p>
          <Response
            id={task.key}
            label={task.label}
            item={item}
            value={value}
            onChange={(v) => {
              setValue(v);
              schedule(task.key, v);
            }}
          />
          {submitted != null ? (
            <div
              role="status"
              className="space-y-1 border-l-2 border-primary px-4 py-2"
            >
              <p className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
                Submitted · {task.evaluator}
              </p>
              <pre className="overflow-x-auto text-xs whitespace-pre-wrap">
                {submitted || '(empty)'}
              </pre>
            </div>
          ) : null}
        </div>
      }
      answered={value ? 1 : 0}
      total={1}
      status={status}
      onRetry={retryFailed}
      timer={
        minutes == null ? undefined : { startedAt, minutes, autoSubmit: false }
      }
      navItems={[{ id: task.key, label: 1, answered: Boolean(value) }]}
      onJump={() => {}}
      submitAction={() => setSubmitted(value)}
    />
  );
}
