'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  createExamTaskAttempt,
  createExamTaskSitting,
  createMockAttempt,
  getProfile,
  listPublishedExamTasks,
  getMockAttempt,
  getMockSectionAttempts,
  getMockSiblings,
  latestOpenMock,
  mockAllowance,
  mockContentExclusions,
  pickRandomPassages,
  pickRandomPrompt,
  pickRandomSpeakingTest,
  pickRandomTracks,
} from '@/lib/db/queries';
import { getExam } from '@bandzen/exams/registry';
import { mockPosition, mockSectionUrl } from '@/lib/mock';
import { composeSitting, tasksForSkill } from '@/lib/exam-sitting';

const PASSAGES_PER_MOCK = 3;
const TRACKS_PER_MOCK = 4;

/**
 * Items per task type in a sitting built from exam tasks.
 *
 * Pearson does not publish how many of each type a real PTE test contains, and
 * candidate reports vary, so this is a configuration rather than a claim. One
 * of each is what the QA bank can currently fill.
 */
const ITEMS_PER_TASK_TYPE = 1;

/**
 * Start (or resume) a full four-skill mock.
 *
 * Resuming is always free, same reasoning as `startWritingAttempt` — the
 * weekly slot was spent when the sitting began, not when it finishes.
 * Content is picked once, here, and locked into the `mockAttempts` row; the
 * five section `attempts` rows are created one at a time as the candidate
 * reaches each one — see `enterMockSection`.
 */
export async function startMock() {
  const userId = await requireUserId();

  const open = await latestOpenMock(userId);
  if (open) {
    const siblings = await getMockSiblings(userId, open.id);
    redirect(
      mockSectionUrl(open.id, mockPosition(siblings, open.examKey), open.kind),
    );
  }

  const profile = await getProfile(userId);
  const exam = getExam(profile?.examKey ?? 'ielts');
  if (!exam) notFound();

  // An exam whose content is task items composes its sitting from those, in
  // the order the exam declares them. IELTS's four content tables follow below.
  if (exam.key !== 'ielts') {
    const cap = await mockAllowance(userId);
    if (!cap.allowed) redirect('/upgrade?from=mock_wall');

    const published = await listPublishedExamTasks(exam.key);
    const taskIds = composeSitting(exam, published, ITEMS_PER_TASK_TYPE);
    if (!taskIds.length) notFound();

    const sitting = await createExamTaskSitting({
      userId,
      examKey: exam.key,
      examVersion: exam.version,
      taskIds,
    });
    after(() => capture(userId, 'mock_started', { kind: sitting.kind }));
    redirect(`/mock/${sitting.id}/next`);
  }

  // The gate, and the only one on this path — same shape as the essay wall.
  //
  // ponytail: check-then-insert, same race the essay wall accepts and for the
  // same reason: Neon is HTTP, so there is no transaction to take, and this
  // only spends one extra sitting on a double-submit, not an unbounded one.
  const cap = await mockAllowance(userId);
  if (!cap.allowed) redirect('/upgrade?from=mock_wall');

  const exclusions = await mockContentExclusions(userId);
  const [passages, tracks, task1, task2, speakingTest] = await Promise.all([
    pickRandomPassages(PASSAGES_PER_MOCK, exclusions.passageIds),
    pickRandomTracks(TRACKS_PER_MOCK, exclusions.trackIds),
    pickRandomPrompt(1, exclusions.promptIds),
    pickRandomPrompt(2, exclusions.promptIds),
    pickRandomSpeakingTest(exclusions.speakingTestIds),
  ]);

  if (passages.length < PASSAGES_PER_MOCK)
    throw new Error(
      `Not enough passages seeded for a mock — need ${PASSAGES_PER_MOCK}`,
    );
  if (tracks.length < TRACKS_PER_MOCK)
    throw new Error(
      `Not enough listening tracks seeded for a mock — need ${TRACKS_PER_MOCK}`,
    );
  if (!task1)
    throw new Error('No Task 1 prompt seeded — see apps/app/README.md');
  if (!task2)
    throw new Error('No Task 2 prompt seeded — see apps/app/README.md');
  if (!speakingTest)
    throw new Error('No speaking test seeded — see apps/app/README.md');

  const mock = await createMockAttempt({
    userId,
    readingPassageIds: passages.map((p) => p.id),
    listeningTrackIds: tracks.map((t) => t.id),
    writingTask1PromptId: task1.id,
    writingTask2PromptId: task2.id,
    speakingTestId: speakingTest.id,
  });

  after(() => capture(userId, 'mock_started', { kind: mock.kind }));

  redirect(`/mock/${mock.id}/next?section=listening`);
}

/**
 * The interstitial's "Continue": creates the current section's attempt
 * row(s) if they don't exist yet, then sends the candidate straight into it.
 * Ignores whatever `?section=` the interstitial was rendered with and
 * recomputes the real position itself — a stale or hand-edited link should
 * land the candidate on the actual current section, not wherever the URL
 * claimed.
 *
 * Shared by `/mock` and `/diagnostic`. Section rows carry the sitting's own
 * `kind`. Reading and Listening create one row with no content pointer of
 * their own (`passageId`/`trackId` stay null); their engines resolve the
 * passages / tracks through `mockAttemptId`. Writing creates two rows for a
 * mock (one per task) and one for a diagnostic (Task 2 only). Idempotent: a
 * reload finds the row(s) already there and redirects into them.
 */
export async function enterMockSection(formData: FormData) {
  const mockAttemptId = String(formData.get('mockAttemptId') ?? '');
  if (!mockAttemptId) throw new Error('Missing mock attempt');

  const userId = await requireUserId();
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) notFound();
  if (mock.submittedAt) {
    redirect(mockSectionUrl(mockAttemptId, null, mock.kind));
  }

  const siblings = await getMockSiblings(userId, mockAttemptId);
  const position = mockPosition(siblings, mock.examKey);
  if (!position) redirect(mockSectionUrl(mockAttemptId, null, mock.kind));

  // A task sitting creates every one of the section's rows at once, one per
  // task type. Lazily creating them would break the sequencer: it advances as
  // soon as no row for a skill is `in_progress`, so a half-built section would
  // be treated as finished and the rest of it skipped.
  if (mock.taskIds) {
    const published = await listPublishedExamTasks(mock.examKey);
    const ids = tasksForSkill(mock.examKey, published, mock.taskIds, position);
    const byId = new Map(published.map((t) => [t.id, t]));

    const grouped = new Map<string, string[]>();
    for (const id of ids) {
      const taskType = byId.get(id)?.taskType;
      if (taskType)
        grouped.set(taskType, [...(grouped.get(taskType) ?? []), id]);
    }

    const existing = await getMockSectionAttempts(
      userId,
      mockAttemptId,
      position,
    );
    const already = new Set(existing.map((r) => r.taskType));
    for (const [taskType, taskIds] of grouped) {
      if (already.has(taskType)) continue;
      await createExamTaskAttempt({
        userId,
        examKey: mock.examKey,
        examVersion: mock.examVersion,
        taskType,
        module: position,
        taskIds,
        mockAttemptId,
      });
    }

    const rows = await getMockSectionAttempts(userId, mockAttemptId, position);
    const next = rows.find((r) => r.status === 'in_progress') ?? rows[0];
    if (!next?.taskType) notFound();
    redirect(`/practice/${mock.examKey}/${next.taskType}/${next.id}`);
  }

  const sectionKind = mock.kind;
  const existing = await getMockSectionAttempts(
    userId,
    mockAttemptId,
    position,
  );

  if (position === 'writing') {
    // Every IELTS sitting has a Task 2 prompt. The column is nullable only
    // because an exam-task sitting has no IELTS prompts at all, and such a
    // sitting never reaches this branch.
    const task2PromptId = mock.writingTask2PromptId;
    if (!task2PromptId) notFound();

    // A mock has Task 1 + Task 2; a diagnostic has Task 2 only.
    if (mock.writingTask1PromptId != null) {
      const task1 =
        existing.find((r) => r.promptId === mock.writingTask1PromptId) ??
        (await createAttempt({
          userId,
          module: 'writing',
          kind: sectionKind,
          promptId: mock.writingTask1PromptId,
          mockAttemptId,
        }));
      if (!existing.some((r) => r.promptId === task2PromptId)) {
        await createAttempt({
          userId,
          module: 'writing',
          kind: sectionKind,
          promptId: task2PromptId,
          mockAttemptId,
        });
      }
      redirect(`/writing/${task1.id}`);
    }

    const row =
      existing[0] ??
      (await createAttempt({
        userId,
        module: 'writing',
        kind: sectionKind,
        promptId: task2PromptId,
        mockAttemptId,
      }));
    redirect(`/writing/${row.id}`);
  }

  if (existing[0]) {
    redirect(`/${position}/${existing[0].id}`);
  }

  const attempt = await createAttempt({
    userId,
    module: position,
    kind: sectionKind,
    mockAttemptId,
    ...(position === 'speaking' && mock.speakingTestId
      ? { speakingTestId: mock.speakingTestId }
      : {}),
  });
  redirect(`/${position}/${attempt.id}`);
}
