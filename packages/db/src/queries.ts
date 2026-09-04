import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNotNull,
  lt,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import { db } from './client';
import { ContentInUseError, PublishValidationError } from './errors';
import {
  attempts,
  lessonProgress,
  lessons,
  listeningTracks,
  passages,
  questionAnswers,
  questions,
  contentEvents,
  resources,
  speakingPrompts,
  speakingTests,
  writingPrompts,
  type ContentEventAction,
  type ContentStatus,
  type Lesson,
  type LessonStage,
  type Question,
  type Resource,
} from './schema';

/**
 * Content and lesson-progress queries shared across apps (student-facing and
 * admin/CMS). Split out of apps/app's queries.ts because these tables are
 * shared, unscoped content — apps/admin needs the same read/write surface.
 */

async function firstRow<T>(rows: T[]) {
  return rows[0] ?? null;
}

/** The `?q=` box on every admin list: case-insensitive match on title/slug. */
export type AdminListFilters = { status?: ContentStatus; q?: string };
function adminSearch(
  slugCol: Parameters<typeof ilike>[0],
  titleCol: Parameters<typeof ilike>[0] | null,
  q?: string,
) {
  if (!q?.trim()) return undefined;
  const like = `%${q.trim()}%`;
  const parts = [ilike(slugCol, like)];
  if (titleCol) parts.push(ilike(titleCol, like));
  return or(...parts);
}

/**
 * A generation run (listening audio/transcript, speaking examiner audio) older
 * than this is treated as dead: its serverless function was almost certainly
 * killed mid-run, which clears neither the field nor the error. The generate
 * routes let a new run start past it; the editors show a retry instead of
 * spinning. Kept here so the routes and the `get*Admin` getters agree.
 */
export const GENERATION_STALE_MS = 3 * 60 * 1000;

export function isGenerationStale(startedAt: Date | null): boolean {
  return startedAt != null && Date.now() - startedAt.getTime() > GENERATION_STALE_MS;
}

/** Difficulty bands, as the practice filters present them. */
export const DIFFICULTY_RANGE = {
  easy: [1, 2],
  medium: [3, 3],
  hard: [4, 5],
} as const;

export function listPassages(filters?: {
  kind?: Question['kind'];
  difficulty?: keyof typeof DIFFICULTY_RANGE;
  id?: string;
}) {
  const clauses = [eq(passages.status, 'published')];

  if (filters?.id) clauses.push(eq(passages.id, filters.id));

  if (filters?.difficulty) {
    const [min, max] = DIFFICULTY_RANGE[filters.difficulty];
    clauses.push(gte(passages.difficulty, min), lte(passages.difficulty, max));
  }

  if (filters?.kind) {
    // A passage qualifies if it carries at least one question of that kind.
    // EXISTS rather than a join, so a passage with four matching questions
    // still comes back once.
    clauses.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(questions)
          .where(
            and(
              eq(questions.passageId, passages.id),
              eq(questions.kind, filters.kind),
            ),
          ),
      ),
    );
  }

  return db
    .select({
      id: passages.id,
      title: passages.title,
      topic: passages.topic,
      difficulty: passages.difficulty,
    })
    .from(passages)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(passages.difficulty);
}

export function listWritingPrompts(filters?: { task?: number; id?: string }) {
  const clauses = [eq(writingPrompts.status, 'published')];
  if (filters?.task) clauses.push(eq(writingPrompts.task, filters.task));
  if (filters?.id) clauses.push(eq(writingPrompts.id, filters.id));

  return db
    .select({
      id: writingPrompts.id,
      task: writingPrompts.task,
      format: writingPrompts.format,
      promptText: writingPrompts.promptText,
    })
    .from(writingPrompts)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(writingPrompts.task);
}

export async function pickEasiestPassage() {
  return firstRow(
    await db
      .select({ id: passages.id })
      .from(passages)
      .where(eq(passages.status, 'published'))
      .orderBy(passages.difficulty)
      .limit(1),
  );
}

/**
 * Listening tracks. No format filter — real IELTS Listening is identical for
 * Academic and General Training, unlike Reading/Writing.
 */
export function listTracks(filters?: {
  kind?: Question['kind'];
  difficulty?: keyof typeof DIFFICULTY_RANGE;
  id?: string;
}) {
  const clauses = [eq(listeningTracks.status, 'published')];

  if (filters?.id) clauses.push(eq(listeningTracks.id, filters.id));

  if (filters?.difficulty) {
    const [min, max] = DIFFICULTY_RANGE[filters.difficulty];
    clauses.push(
      gte(listeningTracks.difficulty, min),
      lte(listeningTracks.difficulty, max),
    );
  }

  if (filters?.kind) {
    // A track qualifies if it carries at least one question of that kind.
    clauses.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(questions)
          .where(
            and(
              eq(questions.trackId, listeningTracks.id),
              eq(questions.kind, filters.kind),
            ),
          ),
      ),
    );
  }

  return db
    .select({
      id: listeningTracks.id,
      title: listeningTracks.title,
      topic: listeningTracks.topic,
      difficulty: listeningTracks.difficulty,
    })
    .from(listeningTracks)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(listeningTracks.difficulty);
}

export async function pickEasiestTrack() {
  return firstRow(
    await db
      .select({ id: listeningTracks.id })
      .from(listeningTracks)
      .where(eq(listeningTracks.status, 'published'))
      .orderBy(listeningTracks.difficulty)
      .limit(1),
  );
}

// ---------------------------------------------------------------------------
// Speaking — practice list (student-facing)
// ---------------------------------------------------------------------------

export function listSpeakingTests(filters?: {
  difficulty?: keyof typeof DIFFICULTY_RANGE;
  id?: string;
}) {
  const clauses = [eq(speakingTests.status, 'published')];
  if (filters?.id) clauses.push(eq(speakingTests.id, filters.id));
  if (filters?.difficulty) {
    const [min, max] = DIFFICULTY_RANGE[filters.difficulty];
    clauses.push(
      gte(speakingTests.difficulty, min),
      lte(speakingTests.difficulty, max),
    );
  }
  return db
    .select({
      id: speakingTests.id,
      title: speakingTests.title,
      topic: speakingTests.topic,
      difficulty: speakingTests.difficulty,
    })
    .from(speakingTests)
    .where(and(...clauses))
    .orderBy(speakingTests.difficulty);
}

export async function pickEasiestSpeakingTest() {
  return firstRow(
    await db
      .select({ id: speakingTests.id })
      .from(speakingTests)
      .where(eq(speakingTests.status, 'published'))
      .orderBy(speakingTests.difficulty)
      .limit(1),
  );
}

export async function pickTask2Prompt() {
  return firstRow(
    await db
      .select({ id: writingPrompts.id })
      .from(writingPrompts)
      .where(
        and(eq(writingPrompts.task, 2), eq(writingPrompts.status, 'published')),
      )
      .limit(1),
  );
}

// ---------------------------------------------------------------------------
// Learning — lessons and resources, editable through the CMS
// ---------------------------------------------------------------------------

export async function listLessons(filters?: { status?: ContentStatus }) {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.status, filters?.status ?? 'published'))
    .orderBy(lessons.module, lessons.group, lessons.orderIndex);
}

export async function getLessonBySlug(
  slug: string,
  filters?: { status?: ContentStatus },
) {
  return firstRow(
    await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.slug, slug),
          eq(lessons.status, filters?.status ?? 'published'),
        ),
      )
      .limit(1),
  );
}

export async function listResources(filters?: { status?: ContentStatus }) {
  return db
    .select()
    .from(resources)
    .where(eq(resources.status, filters?.status ?? 'published'))
    .orderBy(resources.category, resources.orderIndex);
}

export async function getResourceBySlug(
  slug: string,
  filters?: { status?: ContentStatus },
) {
  return firstRow(
    await db
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.slug, slug),
          eq(resources.status, filters?.status ?? 'published'),
        ),
      )
      .limit(1),
  );
}

/**
 * `lessonProgress.lessonId` is a uuid FK to `lessons.id`, but every caller
 * (across both apps) identifies a lesson by its slug -- so both functions
 * here resolve slug <-> id internally and keep the slug-based contract.
 */
export async function listLessonProgress(userId: string) {
  return db
    .select({
      lessonId: lessons.slug,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(eq(lessonProgress.userId, userId));
}

export async function markLessonComplete(userId: string, lessonSlug: string) {
  const lesson = await firstRow(
    await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.slug, lessonSlug)),
  );
  if (!lesson) return;
  // Re-finishing a lesson is not an error and must not move the original
  // completion time -- the plan reads "done today" off that timestamp.
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId: lesson.id })
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// CMS — passages, questions, and answers
//
// The neon-http driver has no transaction support (verified: it throws "No
// transactions support in neon-http driver"), so a question and its answer
// are written as two sequential statements, not one transaction. That's fine
// here: nothing else depends on them landing atomically, and a question left
// without an answer by a failed second write is exactly what
// `checkPassageCompleteness` already exists to catch before publish — it is
// a visible "incomplete" draft, not silent data corruption.
// ---------------------------------------------------------------------------

export async function listPassagesAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(passages)
    .where(
      and(
        filters?.status ? eq(passages.status, filters.status) : undefined,
        adminSearch(passages.slug, passages.title, filters?.q),
      ),
    )
    .orderBy(passages.createdAt);
}

export async function getPassageAdmin(id: string) {
  const passage = await firstRow(
    await db.select().from(passages).where(eq(passages.id, id)).limit(1),
  );
  if (!passage) return null;

  const passageQuestions = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
      evidence: questions.evidence,
      explanation: questions.explanation,
      answer: questionAnswers.answer,
    })
    .from(questions)
    .leftJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(eq(questions.passageId, id))
    .orderBy(questions.idx);

  return { ...passage, questions: passageQuestions };
}

export async function createPassage(input: {
  slug: string;
  title: string;
  body: string;
  topic?: string | null;
  headings?: string[] | null;
  format?: 'academic' | 'general';
  difficulty?: number;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(passages)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updatePassage(
  id: string,
  input: Partial<{
    title: string;
    body: string;
    topic: string | null;
    headings: string[] | null;
    format: 'academic' | 'general';
    difficulty: number;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(passages)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(passages.id, id))
      .returning(),
  );
}

/** Everything a passage needs before it can go live. Returns a human-readable issue per gap. */
export async function checkPassageCompleteness(id: string): Promise<string[]> {
  const passage = await firstRow(
    await db.select().from(passages).where(eq(passages.id, id)).limit(1),
  );
  if (!passage) return ['the passage itself (not found)'];

  const passageQuestions = await db
    .select({
      idx: questions.idx,
      kind: questions.kind,
      answer: questionAnswers.answer,
    })
    .from(questions)
    .leftJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(eq(questions.passageId, id));

  const issues: string[] = [];
  if (passageQuestions.length === 0) issues.push('at least one question');

  for (const q of passageQuestions) {
    if (!q.answer || q.answer.length === 0) {
      issues.push(`an answer for question ${q.idx}`);
    }
  }

  const needsHeadings = passageQuestions.some(
    (q) => q.kind === 'matching_headings',
  );
  if (needsHeadings && (!passage.headings || passage.headings.length === 0)) {
    issues.push('a headings list, for the matching_headings question(s)');
  }

  return issues;
}

export async function publishPassage(id: string, updatedBy: string) {
  const issues = await checkPassageCompleteness(id);
  if (issues.length > 0) throw new PublishValidationError(issues);
  return firstRow(
    await db
      .update(passages)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(passages.id, id))
      .returning(),
  );
}

export async function unpublishPassage(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(passages)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(passages.id, id))
      .returning(),
  );
}

export async function deletePassage(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(attempts)
    .where(eq(attempts.passageId, id));
  if (n > 0) {
    throw new ContentInUseError(
      `Cannot delete: ${n} attempt(s) reference this passage. Unpublish it instead.`,
    );
  }
  await db.delete(passages).where(eq(passages.id, id));
}

export async function createQuestion(
  /** Exactly one of these, matching which module owns the question. */
  parent: { passageId: string } | { trackId: string },
  input: {
    idx: number;
    kind: Question['kind'];
    prompt: string;
    options?: string[] | null;
    evidence?: string | null;
    explanation?: string | null;
    answer: string[];
  },
) {
  const question = await firstRow(
    await db
      .insert(questions)
      .values({
        ...parent,
        idx: input.idx,
        kind: input.kind,
        prompt: input.prompt,
        options: input.options ?? null,
        evidence: input.evidence ?? null,
        explanation: input.explanation ?? null,
      })
      .returning(),
  );
  if (!question) return null;
  await db
    .insert(questionAnswers)
    .values({ questionId: question.id, answer: input.answer });
  return question;
}

export async function updateQuestion(
  id: string,
  input: Partial<{
    idx: number;
    kind: Question['kind'];
    prompt: string;
    options: string[] | null;
    evidence: string | null;
    explanation: string | null;
    answer: string[];
  }>,
) {
  const { answer, ...questionFields } = input;
  let question: Question | null = null;
  if (Object.keys(questionFields).length > 0) {
    question = await firstRow(
      await db
        .update(questions)
        .set(questionFields)
        .where(eq(questions.id, id))
        .returning(),
    );
  }
  if (answer) {
    await db
      .insert(questionAnswers)
      .values({ questionId: id, answer })
      .onConflictDoUpdate({
        target: questionAnswers.questionId,
        set: { answer },
      });
  }
  return (
    question ??
    firstRow(
      await db.select().from(questions).where(eq(questions.id, id)).limit(1),
    )
  );
}

export async function deleteQuestion(id: string) {
  await db.delete(questions).where(eq(questions.id, id));
}

// ---------------------------------------------------------------------------
// CMS — listening tracks
//
// Modelled on passages: a track carries child `questions` (via the shared
// `createQuestion`/`updateQuestion`/`deleteQuestion` above) and a track-level
// `matchingOptions` list playing the same role `passages.headings` does for
// matching_headings. The one thing passages has no analogue for is `audioUrl`,
// which the CMS uploads to R2 before it ever calls `createTrack`.
// ---------------------------------------------------------------------------

export async function listTracksAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(listeningTracks)
    .where(
      and(
        filters?.status
          ? eq(listeningTracks.status, filters.status)
          : undefined,
        adminSearch(listeningTracks.slug, listeningTracks.title, filters?.q),
      ),
    )
    .orderBy(listeningTracks.createdAt);
}

export async function getTrackAdmin(id: string) {
  const track = await firstRow(
    await db
      .select()
      .from(listeningTracks)
      .where(eq(listeningTracks.id, id))
      .limit(1),
  );
  if (!track) return null;

  const trackQuestions = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
      evidence: questions.evidence,
      explanation: questions.explanation,
      answer: questionAnswers.answer,
    })
    .from(questions)
    .leftJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(eq(questions.trackId, id))
    .orderBy(questions.idx);

  return {
    ...track,
    questions: trackQuestions,
    generationTimedOut: isGenerationStale(track.generationStartedAt),
  };
}

export async function createTrack(input: {
  slug: string;
  title: string;
  /** At least one of transcript / audioUrl. The CMS generates whichever is absent. */
  transcript?: string | null;
  audioUrl?: string | null;
  topic?: string | null;
  matchingOptions?: string[] | null;
  difficulty?: number;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(listeningTracks)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updateTrack(
  id: string,
  input: Partial<{
    title: string;
    transcript: string | null;
    audioUrl: string | null;
    topic: string | null;
    matchingOptions: string[] | null;
    difficulty: number;
    generationError: string | null;
    generationStartedAt: Date | null;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(listeningTracks)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(listeningTracks.id, id))
      .returning(),
  );
}

/** The fields the CMS generate route reads to decide what to do. */
export async function getTrackGenerationState(id: string) {
  return firstRow(
    await db
      .select({
        id: listeningTracks.id,
        slug: listeningTracks.slug,
        transcript: listeningTracks.transcript,
        audioUrl: listeningTracks.audioUrl,
        generationError: listeningTracks.generationError,
        generationStartedAt: listeningTracks.generationStartedAt,
      })
      .from(listeningTracks)
      .where(eq(listeningTracks.id, id))
      .limit(1),
  );
}

/** Everything a track needs before it can go live. One issue per gap. */
export async function checkTrackCompleteness(id: string): Promise<string[]> {
  const track = await firstRow(
    await db
      .select()
      .from(listeningTracks)
      .where(eq(listeningTracks.id, id))
      .limit(1),
  );
  if (!track) return ['the track itself (not found)'];

  const trackQuestions = await db
    .select({
      idx: questions.idx,
      kind: questions.kind,
      answer: questionAnswers.answer,
    })
    .from(questions)
    .leftJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(eq(questions.trackId, id));

  const issues: string[] = [];
  if (!track.transcript) issues.push('a transcript');
  if (!track.audioUrl) issues.push('an audio file');
  if (trackQuestions.length === 0) issues.push('at least one question');

  for (const q of trackQuestions) {
    if (!q.answer || q.answer.length === 0) {
      issues.push(`an answer for question ${q.idx}`);
    }
  }

  const matchingQuestions = trackQuestions.filter((q) => q.kind === 'matching');
  const options = track.matchingOptions ?? [];
  if (matchingQuestions.length > 0 && options.length === 0) {
    issues.push('a matching options list, for the matching question(s)');
  } else {
    for (const q of matchingQuestions) {
      if (q.answer && !q.answer.every((a) => options.includes(a))) {
        issues.push(
          `question ${q.idx}'s answer is not in the matching options list`,
        );
      }
    }
  }

  return issues;
}

export async function publishTrack(id: string, updatedBy: string) {
  const issues = await checkTrackCompleteness(id);
  if (issues.length > 0) throw new PublishValidationError(issues);
  return firstRow(
    await db
      .update(listeningTracks)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(listeningTracks.id, id))
      .returning(),
  );
}

export async function unpublishTrack(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(listeningTracks)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(listeningTracks.id, id))
      .returning(),
  );
}

export async function deleteTrack(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(attempts)
    .where(eq(attempts.trackId, id));
  if (n > 0) {
    throw new ContentInUseError(
      `Cannot delete: ${n} attempt(s) reference this track. Unpublish it instead.`,
    );
  }
  await db.delete(listeningTracks).where(eq(listeningTracks.id, id));
}

// ---------------------------------------------------------------------------
// CMS — speaking tests
//
// Modelled on the listening CMS: a test carries child `speaking_prompts`
// (parallel to `questions`, minus the answer key), and a test-level audio
// generation pass fills in every prompt's examiner voice — see the admin
// `/api/speaking/[id]/generate` route.
// ---------------------------------------------------------------------------

export async function listSpeakingTestsAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(speakingTests)
    .where(
      and(
        filters?.status ? eq(speakingTests.status, filters.status) : undefined,
        adminSearch(speakingTests.slug, speakingTests.title, filters?.q),
      ),
    )
    .orderBy(speakingTests.createdAt);
}

export async function getSpeakingTestAdmin(id: string) {
  const test = await firstRow(
    await db
      .select()
      .from(speakingTests)
      .where(eq(speakingTests.id, id))
      .limit(1),
  );
  if (!test) return null;

  const prompts = await db
    .select()
    .from(speakingPrompts)
    .where(eq(speakingPrompts.testId, id))
    .orderBy(speakingPrompts.idx);

  return {
    ...test,
    prompts,
    generationTimedOut: isGenerationStale(test.generationStartedAt),
  };
}

export async function createSpeakingTest(input: {
  slug: string;
  title: string;
  topic?: string | null;
  difficulty?: number;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(speakingTests)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updateSpeakingTest(
  id: string,
  input: Partial<{
    title: string;
    topic: string | null;
    difficulty: number;
    generationError: string | null;
    generationStartedAt: Date | null;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(speakingTests)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(speakingTests.id, id))
      .returning(),
  );
}

export async function createSpeakingPrompt(
  testId: string,
  input: {
    idx: number;
    part: number;
    text: string;
    cueCardPoints?: string[] | null;
    prepSeconds?: number;
  },
) {
  return firstRow(
    await db
      .insert(speakingPrompts)
      .values({ testId, ...input })
      .returning(),
  );
}

export async function updateSpeakingPrompt(
  id: string,
  input: Partial<{
    idx: number;
    part: number;
    text: string;
    cueCardPoints: string[] | null;
    prepSeconds: number;
    audioUrl: string | null;
  }>,
) {
  return firstRow(
    await db
      .update(speakingPrompts)
      .set(input)
      .where(eq(speakingPrompts.id, id))
      .returning(),
  );
}

export async function deleteSpeakingPrompt(id: string) {
  await db.delete(speakingPrompts).where(eq(speakingPrompts.id, id));
}

/** The fields the CMS generate route reads to decide what to synthesize. */
export async function getSpeakingTestGenerationState(id: string) {
  const test = await firstRow(
    await db
      .select({
        id: speakingTests.id,
        slug: speakingTests.slug,
        generationStartedAt: speakingTests.generationStartedAt,
      })
      .from(speakingTests)
      .where(eq(speakingTests.id, id))
      .limit(1),
  );
  if (!test) return null;

  const prompts = await db
    .select({
      id: speakingPrompts.id,
      idx: speakingPrompts.idx,
      text: speakingPrompts.text,
      audioUrl: speakingPrompts.audioUrl,
    })
    .from(speakingPrompts)
    .where(eq(speakingPrompts.testId, id))
    .orderBy(speakingPrompts.idx);

  return { ...test, prompts };
}

/** Everything a test needs before it can go live. One issue per gap. */
export async function checkSpeakingTestCompleteness(
  id: string,
): Promise<string[]> {
  const test = await firstRow(
    await db
      .select()
      .from(speakingTests)
      .where(eq(speakingTests.id, id))
      .limit(1),
  );
  if (!test) return ['the test itself (not found)'];

  const prompts = await db
    .select()
    .from(speakingPrompts)
    .where(eq(speakingPrompts.testId, id));

  const issues: string[] = [];
  for (const part of [1, 2, 3]) {
    if (!prompts.some((p) => p.part === part)) {
      issues.push(`at least one Part ${part} prompt`);
    }
  }
  for (const p of prompts) {
    if (!p.audioUrl) issues.push(`examiner audio for prompt ${p.idx}`);
    if (p.part === 2 && (!p.cueCardPoints || p.cueCardPoints.length === 0)) {
      issues.push(`cue-card points for the Part 2 prompt (${p.idx})`);
    }
  }
  return issues;
}

export async function publishSpeakingTest(id: string, updatedBy: string) {
  const issues = await checkSpeakingTestCompleteness(id);
  if (issues.length > 0) throw new PublishValidationError(issues);
  return firstRow(
    await db
      .update(speakingTests)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(speakingTests.id, id))
      .returning(),
  );
}

export async function unpublishSpeakingTest(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(speakingTests)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(speakingTests.id, id))
      .returning(),
  );
}

export async function deleteSpeakingTest(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(attempts)
    .where(eq(attempts.speakingTestId, id));
  if (n > 0) {
    throw new ContentInUseError(
      `Cannot delete: ${n} attempt(s) reference this test. Unpublish it instead.`,
    );
  }
  await db.delete(speakingTests).where(eq(speakingTests.id, id));
}

// ---------------------------------------------------------------------------
// CMS — writing prompts
// ---------------------------------------------------------------------------

export async function listWritingPromptsAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(writingPrompts)
    .where(
      and(
        filters?.status
          ? eq(writingPrompts.status, filters.status)
          : undefined,
        adminSearch(writingPrompts.slug, null, filters?.q),
      ),
    )
    .orderBy(writingPrompts.createdAt);
}

export async function getWritingPromptById(id: string) {
  return firstRow(
    await db
      .select()
      .from(writingPrompts)
      .where(eq(writingPrompts.id, id))
      .limit(1),
  );
}

export async function createWritingPrompt(input: {
  slug: string;
  task: number;
  format?: 'academic' | 'general';
  promptText: string;
  /** The Task 1 figure. Only the JSON import sets it; no form edits it yet. */
  chartData?: unknown;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(writingPrompts)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updateWritingPrompt(
  id: string,
  input: Partial<{
    task: number;
    format: 'academic' | 'general';
    promptText: string;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(writingPrompts)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(writingPrompts.id, id))
      .returning(),
  );
}

// No completeness gate beyond what the column constraints already enforce
// (promptText is NOT NULL) -- a writing prompt has no sub-items like a
// passage's questions/answers, so there is nothing further to check.
export async function publishWritingPrompt(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(writingPrompts)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(writingPrompts.id, id))
      .returning(),
  );
}

export async function unpublishWritingPrompt(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(writingPrompts)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(writingPrompts.id, id))
      .returning(),
  );
}

export async function deleteWritingPrompt(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(attempts)
    .where(eq(attempts.promptId, id));
  if (n > 0) {
    throw new ContentInUseError(
      `Cannot delete: ${n} attempt(s) reference this prompt. Unpublish it instead.`,
    );
  }
  await db.delete(writingPrompts).where(eq(writingPrompts.id, id));
}

// ---------------------------------------------------------------------------
// CMS — lessons
// ---------------------------------------------------------------------------

export async function listLessonsAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(lessons)
    .where(
      and(
        filters?.status ? eq(lessons.status, filters.status) : undefined,
        adminSearch(lessons.slug, lessons.title, filters?.q),
      ),
    )
    .orderBy(lessons.module, lessons.group, lessons.orderIndex);
}

export async function getLessonById(id: string) {
  return firstRow(
    await db.select().from(lessons).where(eq(lessons.id, id)).limit(1),
  );
}

export async function createLesson(input: {
  slug: string;
  module: Lesson['module'];
  group: Lesson['group'];
  title: string;
  summary: string;
  minutes: number;
  questionKind?: Lesson['questionKind'];
  stages?: LessonStage[] | null;
  orderIndex?: number;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(lessons)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updateLesson(
  id: string,
  input: Partial<{
    title: string;
    summary: string;
    minutes: number;
    questionKind: Lesson['questionKind'];
    stages: LessonStage[] | null;
    orderIndex: number;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(lessons)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning(),
  );
}

export async function checkLessonCompleteness(id: string): Promise<string[]> {
  const lesson = await firstRow(
    await db.select().from(lessons).where(eq(lessons.id, id)).limit(1),
  );
  if (!lesson) return ['the lesson itself (not found)'];

  const issues: string[] = [];
  if (!lesson.stages || lesson.stages.length === 0) {
    issues.push('at least one stage with content');
  } else if (lesson.stages.every((stage) => stage.blocks.length === 0)) {
    issues.push('at least one stage with a non-empty block');
  }
  return issues;
}

export async function publishLesson(id: string, updatedBy: string) {
  const issues = await checkLessonCompleteness(id);
  if (issues.length > 0) throw new PublishValidationError(issues);
  return firstRow(
    await db
      .update(lessons)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning(),
  );
}

export async function unpublishLesson(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(lessons)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(lessons.id, id))
      .returning(),
  );
}

export async function deleteLesson(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(lessonProgress)
    .where(eq(lessonProgress.lessonId, id));
  if (n > 0) {
    throw new ContentInUseError(
      `Cannot delete: ${n} student(s) have completion records for this lesson. Unpublish it instead.`,
    );
  }
  await db.delete(lessons).where(eq(lessons.id, id));
}

// ---------------------------------------------------------------------------
// CMS — resources
//
// Nothing else in the schema references a resource (no attempts, no
// progress table), so unlike passages/prompts/lessons there is no
// delete-safety check to run here -- a hard delete is always safe.
// ---------------------------------------------------------------------------

export async function listResourcesAdmin(filters?: AdminListFilters) {
  return db
    .select()
    .from(resources)
    .where(
      and(
        filters?.status ? eq(resources.status, filters.status) : undefined,
        adminSearch(resources.slug, resources.title, filters?.q),
      ),
    )
    .orderBy(resources.category, resources.orderIndex);
}

export async function getResourceById(id: string) {
  return firstRow(
    await db.select().from(resources).where(eq(resources.id, id)).limit(1),
  );
}

export async function createResource(input: {
  slug: string;
  title: string;
  summary: string;
  category: Resource['category'];
  level: Resource['level'];
  minutes: number;
  module?: Resource['module'];
  questionKind?: Resource['questionKind'];
  body?: string[] | null;
  orderIndex?: number;
  updatedBy: string;
}) {
  return firstRow(
    await db
      .insert(resources)
      .values({ ...input, status: 'draft' })
      .returning(),
  );
}

export async function updateResource(
  id: string,
  input: Partial<{
    title: string;
    summary: string;
    category: Resource['category'];
    level: Resource['level'];
    minutes: number;
    module: Resource['module'];
    questionKind: Resource['questionKind'];
    body: string[] | null;
    orderIndex: number;
  }>,
  updatedBy: string,
) {
  return firstRow(
    await db
      .update(resources)
      .set({ ...input, updatedBy, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning(),
  );
}

export async function checkResourceCompleteness(id: string): Promise<string[]> {
  const resource = await firstRow(
    await db.select().from(resources).where(eq(resources.id, id)).limit(1),
  );
  if (!resource) return ['the resource itself (not found)'];
  return resource.body && resource.body.length > 0 ? [] : ['a written body'];
}

export async function publishResource(id: string, updatedBy: string) {
  const issues = await checkResourceCompleteness(id);
  if (issues.length > 0) throw new PublishValidationError(issues);
  return firstRow(
    await db
      .update(resources)
      .set({ status: 'published', updatedBy, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning(),
  );
}

export async function unpublishResource(id: string, updatedBy: string) {
  return firstRow(
    await db
      .update(resources)
      .set({ status: 'draft', updatedBy, updatedAt: new Date() })
      .where(eq(resources.id, id))
      .returning(),
  );
}

export async function deleteResource(id: string) {
  await db.delete(resources).where(eq(resources.id, id));
}

// ---------------------------------------------------------------------------
// CMS overview — counts and recent activity for the admin home page
// ---------------------------------------------------------------------------

export type ContentType =
  | 'passage'
  | 'listening-track'
  | 'speaking-test'
  | 'writing-prompt'
  | 'lesson'
  | 'resource';

export type StatusCount = { draft: number; published: number; total: number };

function tally(rows: { status: ContentStatus; n: number }[]): StatusCount {
  const draft = rows.find((r) => r.status === 'draft')?.n ?? 0;
  const published = rows.find((r) => r.status === 'published')?.n ?? 0;
  return { draft, published, total: draft + published };
}

/**
 * Draft/published counts per content type, as four grouped aggregates rather
 * than by counting the `list*Admin` results — those `select()` every column,
 * which would ship each passage's body and each lesson's `stages` JSONB across
 * the wire just to take an array length.
 *
 * Written out per table rather than mapped over a list of tables: drizzle's
 * `.from()` generics don't survive a union of different pgTable types.
 */
export async function contentCounts(): Promise<
  Record<ContentType, StatusCount>
> {
  const [passage, track, speakingTest, writingPrompt, lesson, resource] =
    await Promise.all([
      db
        .select({ status: passages.status, n: count() })
        .from(passages)
        .groupBy(passages.status),
      db
        .select({ status: listeningTracks.status, n: count() })
        .from(listeningTracks)
        .groupBy(listeningTracks.status),
      db
        .select({ status: speakingTests.status, n: count() })
        .from(speakingTests)
        .groupBy(speakingTests.status),
      db
        .select({ status: writingPrompts.status, n: count() })
        .from(writingPrompts)
        .groupBy(writingPrompts.status),
      db
        .select({ status: lessons.status, n: count() })
        .from(lessons)
        .groupBy(lessons.status),
      db
        .select({ status: resources.status, n: count() })
        .from(resources)
        .groupBy(resources.status),
    ]);

  return {
    passage: tally(passage),
    'listening-track': tally(track),
    'speaking-test': tally(speakingTest),
    'writing-prompt': tally(writingPrompt),
    lesson: tally(lesson),
    resource: tally(resource),
  };
}

export type RecentEdit = {
  type: ContentType;
  id: string;
  label: string;
  status: ContentStatus;
  updatedAt: Date;
  updatedBy: string | null;
};

/**
 * The most recently touched content across all four tables, newest first.
 *
 * `writing_prompts` has no title column, so it contributes its slug — the same
 * label the /writing-prompts list uses. `updatedBy` is a raw Clerk userId; the
 * caller resolves it to an email (this package has no Clerk access).
 */
export async function listRecentlyEdited(limit = 10): Promise<RecentEdit[]> {
  const rows = await unionAll(
    db
      .select({
        type: sql<ContentType>`'passage'`.as('type'),
        id: passages.id,
        label: passages.title,
        status: passages.status,
        updatedAt: passages.updatedAt,
        updatedBy: passages.updatedBy,
      })
      .from(passages),
    db
      .select({
        type: sql<ContentType>`'listening-track'`.as('type'),
        id: listeningTracks.id,
        label: listeningTracks.title,
        status: listeningTracks.status,
        updatedAt: listeningTracks.updatedAt,
        updatedBy: listeningTracks.updatedBy,
      })
      .from(listeningTracks),
    db
      .select({
        type: sql<ContentType>`'speaking-test'`.as('type'),
        id: speakingTests.id,
        label: speakingTests.title,
        status: speakingTests.status,
        updatedAt: speakingTests.updatedAt,
        updatedBy: speakingTests.updatedBy,
      })
      .from(speakingTests),
    db
      .select({
        type: sql<ContentType>`'writing-prompt'`.as('type'),
        id: writingPrompts.id,
        label: writingPrompts.slug,
        status: writingPrompts.status,
        updatedAt: writingPrompts.updatedAt,
        updatedBy: writingPrompts.updatedBy,
      })
      .from(writingPrompts),
    db
      .select({
        type: sql<ContentType>`'lesson'`.as('type'),
        id: lessons.id,
        label: lessons.title,
        status: lessons.status,
        updatedAt: lessons.updatedAt,
        updatedBy: lessons.updatedBy,
      })
      .from(lessons),
    db
      .select({
        type: sql<ContentType>`'resource'`.as('type'),
        id: resources.id,
        label: resources.title,
        status: resources.status,
        updatedAt: resources.updatedAt,
        updatedBy: resources.updatedBy,
      })
      .from(resources),
  )
    .orderBy(desc(sql`updated_at`))
    .limit(limit);

  return rows;
}

/** One row on the dashboard's "needs attention" list. */
export type AttentionItem = {
  type: ContentType;
  id: string;
  label: string;
  reason: string;
};

/**
 * Content that is stuck and would otherwise stay invisible until someone
 * opened it: an audio/transcript generation that errored, and one whose run
 * went stale (its serverless function was killed before it could finish).
 */
export async function listNeedsAttention(): Promise<AttentionItem[]> {
  const staleBefore = new Date(Date.now() - GENERATION_STALE_MS);

  const tracks = await db
    .select({
      id: listeningTracks.id,
      label: listeningTracks.title,
      error: listeningTracks.generationError,
      startedAt: listeningTracks.generationStartedAt,
    })
    .from(listeningTracks)
    .where(
      or(
        isNotNull(listeningTracks.generationError),
        lt(listeningTracks.generationStartedAt, staleBefore),
      ),
    );

  const tests = await db
    .select({
      id: speakingTests.id,
      label: speakingTests.title,
      error: speakingTests.generationError,
      startedAt: speakingTests.generationStartedAt,
    })
    .from(speakingTests)
    .where(
      or(
        isNotNull(speakingTests.generationError),
        lt(speakingTests.generationStartedAt, staleBefore),
      ),
    );

  const toItem =
    (type: ContentType) =>
    (r: { id: string; label: string; error: string | null }): AttentionItem => ({
      type,
      id: r.id,
      label: r.label,
      reason: r.error ? `Generation failed: ${r.error}` : 'Generation timed out',
    });

  return [
    ...tracks.map(toItem('listening-track')),
    ...tests.map(toItem('speaking-test')),
  ];
}

// ---------------------------------------------------------------------------
// CMS audit trail — content_events
// ---------------------------------------------------------------------------

export type ContentEventRow = {
  id: string;
  action: ContentEventAction;
  actorId: string | null;
  createdAt: Date;
};

/**
 * Append one audit row. Best-effort: an audit-write failure must never fail
 * the mutation it describes, so it swallows and logs rather than throwing.
 */
export async function recordContentEvent(
  entityType: ContentType,
  entityId: string,
  actorId: string | null,
  action: ContentEventAction,
): Promise<void> {
  try {
    await db
      .insert(contentEvents)
      .values({ entityType, entityId, actorId, action });
  } catch (e) {
    console.error('[db] recordContentEvent failed', e);
  }
}

/** The history panel on an editor: newest first. */
export async function listContentEvents(
  entityType: ContentType,
  entityId: string,
  limit = 20,
): Promise<ContentEventRow[]> {
  return db
    .select({
      id: contentEvents.id,
      action: contentEvents.action,
      actorId: contentEvents.actorId,
      createdAt: contentEvents.createdAt,
    })
    .from(contentEvents)
    .where(
      and(
        eq(contentEvents.entityType, entityType),
        eq(contentEvents.entityId, entityId),
      ),
    )
    .orderBy(desc(contentEvents.createdAt))
    .limit(limit);
}
