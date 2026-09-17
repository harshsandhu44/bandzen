import { notFound, redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { requireUserId } from '@/lib/auth';
import {
  getExamTaskAttempt,
  markExamTaskStimulusStarted,
} from '@/lib/db/queries';
import {
  isSpentRecording,
  mockResumeIndex,
  runnerItems,
  sessionMinutes,
} from '@/lib/task-session';
import {
  assertMockSection,
  expireMockSectionIfDue,
  mockSectionClock,
} from '@/lib/mock-guard';
import { TaskRunner } from '@/components/exam/task-runner';
import {
  completeExamTaskStep,
  saveExamTaskAnswer,
  saveExamTaskRecording,
  startExamTaskStimulus,
  submitExamTaskSession,
} from '../actions';

export const metadata = { title: 'Practice task', robots: { index: false } };

export default async function TaskAttemptPage({
  params,
}: PageProps<'/practice/[exam]/[task]/[attemptId]'>) {
  const { exam: examKey, task: taskKey, attemptId } = await params;

  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const userId = await requireUserId();
  // Scoped by userId, so a stranger's attempt id is simply a 404.
  let data = await getExamTaskAttempt(userId, attemptId);
  if (!data || data.attempt.taskType !== task.key) notFound();

  const mock = data.attempt.mockAttemptId != null;

  // A sitting section renders only when it is the one the sitting is on; a
  // bookmarked URL for a finished part redirects to wherever the sitting is.
  if (mock) {
    await assertMockSection(userId, data.attempt);
    // A section whose clock ran out while the candidate was away is closed
    // here, on arrival, rather than rendered with a clock already at zero.
    await expireMockSectionIfDue(userId, data.attempt);
  }

  if (data.attempt.status === 'complete') {
    redirect(`/practice/${exam.key}/${task.key}/${attemptId}/review`);
  }

  const at = mock ? mockResumeIndex(data.items) : 0;

  // A mock item with nothing to play begins the moment it is shown — its
  // preparation window included — so that moment is stamped now, on the
  // server, where a reload cannot move it. Audio stamps itself on play.
  const current = data.items[at];
  if (mock && current && !current.content.stimulus.audioUrl) {
    if (!current.stimulusStartedAt) {
      await markExamTaskStimulusStarted(userId, attemptId, current.taskId);
      data = (await getExamTaskAttempt(userId, attemptId))!;
    }
  }

  const items = runnerItems(task, data.items).map((item, i) => ({
    ...item,
    stimulusStarted: data.items[i]!.stimulusStartedAt != null,
    // Only a mock refuses a second go at a recording left mid-task.
    spent:
      mock &&
      task.renderer === 'recording' &&
      // The item being rendered right now was just stamped above; it is only
      // spent if it had been started on an earlier page load.
      !(i === at && current?.stimulusStartedAt == null) &&
      isSpentRecording(data.items[i]!),
  }));

  const clock = mock ? await mockSectionClock(userId, data.attempt) : null;
  // A task with its own window starts that window when its first item did,
  // not when the section's rows were created — which, in a mock, was the
  // moment the candidate entered the section.
  const firstStarted = data.items
    .map((r) => r.stimulusStartedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const ownMinutes = sessionMinutes(exam, task, items.length);
  const timer = clock
    ? { startedAt: clock.startedAt.toISOString(), minutes: clock.minutes }
    : ownMinutes == null
      ? null
      : {
          startedAt: (mock && firstStarted
            ? firstStarted
            : data.attempt.startedAt
          ).toISOString(),
          minutes: ownMinutes,
        };

  return (
    <TaskRunner
      attemptId={data.attempt.id}
      task={task}
      items={items}
      mode={mock ? 'mock' : 'practice'}
      initialAt={at}
      timer={timer}
      autoSubmit={data.attempt.kind !== 'practice'}
      saveAction={saveExamTaskAnswer}
      uploadAction={saveExamTaskRecording}
      stimulusAction={startExamTaskStimulus}
      stepAction={completeExamTaskStep}
      submitAction={submitExamTaskSession}
    />
  );
}
