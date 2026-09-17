import { desc } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { CURRENT_EXAM_VERSION, EXAM_KEYS } from '@bandzen/exams/registry';
import type { TaskContent } from '@bandzen/exams/content';
import type { AssessmentResult } from '@bandzen/exams/scoring';

/**
 * The source of truth for both the schema and every TypeScript type derived
 * from it. Change a column here, run `pnpm db:generate`, and the migration and
 * the types move together — nothing is hand-maintained.
 *
 * User ids are Supabase's, so they are uuid and reference `auth.users`. Only
 * `profiles` holds that foreign key: it is the row that must not outlive the
 * account. Everything else stays unreferenced on purpose — see `ai_usage`.
 */

/**
 * Supabase Auth's user table, declared only so `profiles` can point at it.
 * Drizzle never reads or writes it and no migration of ours creates it — GoTrue
 * owns that schema entirely. This is a type-level handle, nothing more.
 */
const authSchema = pgSchema('auth');
const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
});

/**
 * IELTS's Academic/General Training split. A *variant* of one exam, not an
 * exam: `exam_key` is the identity, this only means anything when it is
 * `ielts`. Content and legacy profile columns still use the enum.
 */
export const testFormat = pgEnum('test_format', ['academic', 'general']);

/**
 * Which exam a row belongs to. An enum, unlike task types and versions, because
 * adding an exam is rare and deliberate — a migration is the right amount of
 * ceremony for it. The keys and each exam's current format version come from
 * the exam definitions in `@bandzen/exams`.
 */
export const examKey = pgEnum('exam_key', EXAM_KEYS);

export type ExamKey = (typeof examKey.enumValues)[number];

/**
 * Exam ownership for content rows. A function, not a shared object: Drizzle
 * column builders belong to one table each. Defaults to IELTS because every
 * existing row, and every writer that predates other exams, is IELTS.
 */
const examOwnership = () => ({
  examKey: examKey('exam_key').notNull().default('ielts'),
  examVersion: text('exam_version')
    .notNull()
    .default(CURRENT_EXAM_VERSION.ielts),
});

export const questionKind = pgEnum('question_kind', [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
  'matching',
]);

export const attemptModule = pgEnum('attempt_module', [
  'reading',
  'writing',
  'listening',
  'speaking',
]);
export const attemptKind = pgEnum('attempt_kind', [
  'practice',
  'diagnostic',
  'mock',
]);
export const attemptStatus = pgEnum('attempt_status', [
  'in_progress',
  'grading',
  'complete',
  'failed',
]);

/**
 * What a `mock_attempts` row actually is. The full `/mock` is one; the
 * four-skill diagnostic is the other — same sequential-sitting engine, told
 * apart by this column. `'mock'` is the default so every existing row and
 * every `createMockAttempt` caller that predates the diagnostic stays a mock.
 */
export const sittingKind = pgEnum('sitting_kind', ['mock', 'diagnostic']);

/** Whether a content row is visible to students. Set by the CMS. */
export const contentStatus = pgEnum('content_status', ['draft', 'published']);

export const contentEventAction = pgEnum('content_event_action', [
  'created',
  'updated',
  'published',
  'unpublished',
  'deleted',
]);

export const lessonGroup = pgEnum('lesson_group', [
  'foundations',
  'question-types',
  'advanced',
]);

export const resourceCategory = pgEnum('resource_category', [
  'strategies',
  'reading',
  'writing',
  'vocabulary',
  'grammar',
  'exam-day',
  'listening',
  'speaking',
]);

export const resourceLevel = pgEnum('resource_level', [
  'beginner',
  'intermediate',
  'advanced',
]);

/**
 * Which model call a usage row belongs to. One value per call site, not per
 * model — the model is its own column precisely so a swap does not invent a
 * new feature, and so cost can be compared across models for the same job.
 */
export const aiFeature = pgEnum('ai_feature', [
  'writing_grader',
  'speaking_grader',
  'coach',
  'tutor',
  'content_generator',
  'transcribe',
]);

export const aiStatus = pgEnum('ai_status', ['ok', 'failed']);

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * Everything about a user that is ours rather than Supabase Auth's. Created by
 * the `handle_new_user` trigger on `auth.users`, so the row exists from the
 * moment the account does and every query below it has something to find.
 */
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  /**
   * Mirrored from `auth.users` by a trigger, not written by the app. It is here
   * so the CMS can show who edited a lesson, and so the ADMIN_EMAILS
   * break-glass list can be checked, without a round trip to the auth admin API.
   */
  email: text('email'),
  /**
   * 'admin' | 'teacher', or null for a candidate — which is almost everyone.
   * Text rather than an enum because a role is a grant we may add to, and a
   * value we have not seen should not turn into a failed insert.
   */
  role: text('role'),
  /**
   * Which `exam_enrollments` row is the one they are studying for now. Null
   * until they tell us. The enrollment holds the target, date and variant.
   */
  activeExamKey: examKey('active_exam_key'),
  /** Minutes a day they say they can study. Drives today's goal. */
  studyMinutes: integer('study_minutes'),
  /** IANA zone, captured from the browser so "today" means their today. */
  timezone: text('timezone'),
  /** Null until onboarding is finished. The dashboard gates on this. */
  onboardingCompletedAt: timestamp('onboarding_completed_at', {
    withTimezone: true,
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One exam a user is (or was) preparing for. A user can hold several — switching
 * exam changes `profiles.active_exam_key` and never deletes the old row, so
 * history under a previous exam keeps its target and date.
 *
 * Scores are generic `numeric(5,1)`: wide enough for PTE's 10–90 and DET's
 * 10–160, fine-grained enough for IELTS and TOEFL half-steps. Which values are
 * valid is the exam definition's business, not the column's.
 */
export const examEnrollments = pgTable(
  'exam_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    examKey: examKey('exam_key').notNull(),
    /** IELTS `academic`/`general`; null for exams without variants. */
    examVariant: text('exam_variant'),
    examVersion: text('exam_version').notNull(),
    targetScore: numeric('target_score', {
      precision: 5,
      scale: 1,
      mode: 'number',
    }),
    /** Null is "I don't know" — a real answer, as it was for the band. */
    selfAssessedScore: numeric('self_assessed_score', {
      precision: 5,
      scale: 1,
      mode: 'number',
    }),
    testDate: date('test_date'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('exam_enrollments_user_exam_key').on(t.userId, t.examKey),
  ],
);

/**
 * The landing page's "no invite code?" path. Sign-up is open now, so nothing
 * gates on this; it is demand capture and nothing else.
 */
export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('access_requests_email_key').on(t.email)],
);

/**
 * What a candidate has paid for, mirrored from Polar.
 *
 * Polar owns the truth; this is a local copy the webhook keeps current, so
 * rendering a page never depends on their API being reachable. One row per
 * user — resubscribing reuses it.
 *
 * `status` is text rather than an enum on purpose: the values are Polar's, and
 * a state we have not seen before should not turn into a failed insert on a
 * webhook we cannot replay.
 *
 * A grant — the founding cohort, or a new candidate's trial — is a row with a
 * future `current_period_end` and no `polar_subscription_id`. That is the
 * whole mechanism, and it is why entitlement is one date comparison rather
 * than a status matrix.
 */
export const subscriptions = pgTable('subscriptions', {
  userId: uuid('user_id').primaryKey(),
  /** Null for a grant; a Polar subscription id for anything charged for. */
  polarSubscriptionId: text('polar_subscription_id'),
  /** A Polar product id, or `trial` / `founding` for a grant. */
  planId: text('plan_id').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end', {
    withTimezone: true,
  }).notNull(),
  /** Which prompt earned this, from `/upgrade?from=…`. The only attribution. */
  source: text('source'),
  /**
   * What the candidate was charged, in minor units, and in what.
   *
   * Null on a grant and on anything written before Polar. Polar is the
   * Merchant of Record, so tax is its problem and not a column here — this is
   * only what we need to read revenue back per currency.
   */
  currency: text('currency'),
  amountMinor: integer('amount_minor'),
  /**
   * When Polar last modified the object this row was written from.
   *
   * Polar delivers at-least-once and does not promise order, so a delayed
   * renewal event arriving after a revocation could otherwise restore an
   * account that has just been refunded. An event older than this one is
   * dropped. Null on a grant, which no webhook races.
   */
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One row per message a candidate sends Coach.
 *
 * The text is deliberately not stored. The only question ever asked of this
 * table is "how many in the last seven days" — keeping the conversation would
 * be a transcript nobody asked for, and the chat itself is client state that
 * a refresh already discards.
 *
 * It exists at all because Coach is the one metered surface with nothing else
 * to count: an essay leaves an `attempts` row behind, a coach message left
 * nothing.
 */
export const coachMessages = pgTable(
  'coach_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('coach_messages_user_created_idx').on(t.userId, desc(t.createdAt)),
  ],
);

// ---------------------------------------------------------------------------
// Content — generated offline, immutable, identical for every student
// ---------------------------------------------------------------------------

export const passages = pgTable('passages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  topic: text('topic'),
  /**
   * The shared list of headings for this passage's matching_headings
   * questions. Real IELTS presents ONE list covering every paragraph, with
   * more headings than paragraphs, each used at most once — so it belongs to
   * the passage, not to an individual question.
   */
  headings: jsonb('headings').$type<string[] | null>(),
  ...examOwnership(),
  /** The IELTS variant. */
  format: testFormat('format').notNull().default('academic'),
  difficulty: integer('difficulty').notNull().default(3),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Exactly one of passageId/trackId is set, matching which module owns the question. */
    passageId: uuid('passage_id').references(() => passages.id, {
      onDelete: 'cascade',
    }),
    trackId: uuid('track_id').references(
      (): AnyPgColumn => listeningTracks.id,
      { onDelete: 'cascade' },
    ),
    idx: integer('idx').notNull(),
    kind: questionKind('kind').notNull(),
    prompt: text('prompt').notNull(),
    /** Choices for multiple_choice / matching_headings; null otherwise. */
    options: jsonb('options').$type<string[] | null>(),
    /** The sentence that justifies the answer. Powers review mode. */
    evidence: text('evidence'),
    explanation: text('explanation'),
  },
  (t) => [
    uniqueIndex('questions_passage_idx_key').on(t.passageId, t.idx),
    uniqueIndex('questions_track_idx_key').on(t.trackId, t.idx),
  ],
);

/**
 * Separate table, and it stays separate.
 *
 * Nothing in the browser can reach the database now, so this is no longer the
 * last line of defence it was under RLS — but keeping the key off `questions`
 * means a careless `select * from questions` in a route handler still cannot
 * serialise an answer key into a page.
 */
export const questionAnswers = pgTable('question_answers', {
  questionId: uuid('question_id')
    .primaryKey()
    .references(() => questions.id, { onDelete: 'cascade' }),
  answer: jsonb('answer').$type<string[]>().notNull(),
});

/**
 * Task 1's stimulus. Two shapes exist in the wild, because this column was
 * `jsonb` with no schema for a long time before anything rendered it:
 *
 * - `points`: what the CMS import templates (`task1-academic`) teach the
 *   generator to produce now. Line or bar, series as `[x, y]` pairs.
 * - `categories`/`values`: an earlier, more free-form shape already sitting
 *   in real rows — bar or pie, a shared `categories` list, and each series
 *   either an array aligned to `categories` or an object keyed by category
 *   (pie's shape). `PromptChart` normalizes both into one render model
 *   rather than picking a winner and breaking the other's existing content.
 *
 * Pie renders as a bar chart for now (categories on one axis) — full pie
 * support and process diagrams are a follow-up.
 */
export type WritingChartData =
  | {
      kind: 'line' | 'bar';
      title: string;
      unit?: string;
      xLabel?: string;
      series: { name: string; points: [number | string, number][] }[];
    }
  | {
      type: 'bar' | 'pie';
      title: string;
      unit?: string;
      categories?: string[];
      series: { name: string; values: number[] | Record<string, number> }[];
    };

export const writingPrompts = pgTable('writing_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  task: integer('task').notNull(),
  ...examOwnership(),
  /** The IELTS variant. */
  format: testFormat('format').notNull().default('academic'),
  promptText: text('prompt_text').notNull(),
  /** Task 1 only; null for Task 2. */
  chartData: jsonb('chart_data').$type<WritingChartData | null>(),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Real IELTS Listening is identical for Academic and General Training — no
 * `format` column, unlike passages/writingPrompts.
 *
 * `transcript` is the answer key made of prose. It must never be sent to the
 * client during an in-progress attempt; only the offline content scripts and
 * the post-submission review page read it.
 *
 * `transcript` and `audio_url` are nullable: the CMS accepts a track with just
 * one of the two and generates the other (TTS from the transcript, or Whisper
 * from the audio). Both are required before a track can be published — see
 * `checkTrackCompleteness`.
 */
export const listeningTracks = pgTable('listening_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  ...examOwnership(),
  title: text('title').notNull(),
  topic: text('topic'),
  transcript: text('transcript'),
  audioUrl: text('audio_url'),
  /** Shared option list for this track's `matching` questions — same role as passages.headings. */
  matchingOptions: jsonb('matching_options').$type<string[] | null>(),
  /** Downsampled amplitude peaks (0-1) for the runner's waveform display. Computed once alongside audioUrl. */
  peaks: jsonb('peaks').$type<number[] | null>(),
  /** Audio length. Computed once alongside peaks — the mock test's server-anchored Listening deadline sums these. */
  durationSeconds: integer('duration_seconds'),
  /** Last CMS generation failure (TTS or transcription). Null once it succeeds. */
  generationError: text('generation_error'),
  /** Set while a CMS generation is in flight, so a page refresh can't start a second. Cleared on settle. */
  generationStartedAt: timestamp('generation_started_at', {
    withTimezone: true,
  }),
  difficulty: integer('difficulty').notNull().default(3),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One Speaking test — Parts 1, 2 and 3, the same for Academic and General
 * Training (no `format` column, like `listening_tracks`).
 *
 * The prompts live in `speaking_prompts`. There is no answer key: a Speaking
 * response is graded against a rubric, not matched. `generation_started_at`
 * and `generation_error` cover the CMS pass that synthesizes the examiner
 * audio for every prompt that is missing it — see the admin generate route.
 */
export const speakingTests = pgTable('speaking_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  ...examOwnership(),
  title: text('title').notNull(),
  topic: text('topic'),
  /** Last CMS examiner-audio generation failure. Null once it succeeds. */
  generationError: text('generation_error'),
  /** Set while a CMS audio pass is in flight, so a refresh can't start a second. */
  generationStartedAt: timestamp('generation_started_at', {
    withTimezone: true,
  }),
  difficulty: integer('difficulty').notNull().default(3),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One examiner prompt within a test. Parallel to `questions`, minus the answer
 * key and the option lists.
 *
 * `audio_url` is nullable: the CMS accepts a prompt with just text and
 * synthesizes the examiner audio (ElevenLabs) before the test can be
 * published — see `checkSpeakingTestCompleteness`.
 */
export const speakingPrompts = pgTable(
  'speaking_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id')
      .notNull()
      .references(() => speakingTests.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    /** 1, 2 or 3 — which part of the test this prompt belongs to. */
    part: integer('part').notNull(),
    text: text('text').notNull(),
    /** The cue-card bullet points. Part 2 only; null elsewhere. */
    cueCardPoints: jsonb('cue_card_points').$type<string[] | null>(),
    /** Seconds of preparation before recording. 60 for Part 2, 0 otherwise. */
    prepSeconds: integer('prep_seconds').notNull().default(0),
    /** The synthesized examiner voice reading `text`. Null until generated. */
    audioUrl: text('audio_url'),
  },
  (t) => [uniqueIndex('speaking_prompts_test_idx_key').on(t.testId, t.idx)],
);

/**
 * One task item for any exam, in the normalised task-content contract
 * (`@bandzen/exams/content`): text, audio or image stimuli, option banks,
 * gaps, pieces to order, examiner turns, timing and calibration. PTE, TOEFL
 * and DET content lives here; the specialised IELTS tables stay as they are.
 *
 * `exam_key` + `exam_version` + `task_type` say exactly what an item is, and
 * the task type must be one its exam definition declares.
 */
export const examTasks = pgTable(
  'exam_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    examKey: examKey('exam_key').notNull(),
    examVersion: text('exam_version').notNull(),
    section: text('section').notNull(),
    taskType: text('task_type').notNull(),
    content: jsonb('content').$type<TaskContent>().notNull(),
    status: contentStatus('status').notNull().default('draft'),
    updatedBy: uuid('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('exam_tasks_exam_task_idx').on(t.examKey, t.taskType)],
);

/**
 * An exam task's answer key and transcript. Its own table for the same reason
 * `question_answers` is: a careless select of task content can never carry
 * the key or the transcript into a page a candidate is sitting.
 */
export const examTaskAnswers = pgTable('exam_task_answers', {
  taskId: uuid('task_id')
    .primaryKey()
    .references(() => examTasks.id, { onDelete: 'cascade' }),
  answer: jsonb('answer').$type<string[] | null>(),
  transcript: text('transcript'),
});

/**
 * One sequential exam sitting. Two shapes, told apart by `kind`:
 *
 * - `'mock'` — the full four-skill mock: 3 passages, 4 tracks, both writing
 *   prompts, one speaking test.
 * - `'diagnostic'` — the trimmed measure: 2 passages, 2 tracks, Task 2 only
 *   (`writingTask1PromptId` null), one speaking test that a Free candidate
 *   never reaches. On Free the sitting closes after Writing.
 *
 * Either way the content is picked and locked in here at start time, and the
 * section `attempts` rows underneath are created lazily, one per section, as
 * the candidate reaches it.
 *
 * `submittedAt` is stamped when the last section for this sitting submits
 * (Speaking for a mock or Pro diagnostic; Writing for a Free diagnostic).
 * Until then the sitting is resumable; a null here is what the start action
 * checks to resume an in-progress sitting instead of starting a second one.
 */
export const mockAttempts = pgTable(
  'mock_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    kind: sittingKind('kind').notNull().default('mock'),
    ...examOwnership(),
    /** The IELTS variant the sitting's content was picked for. */
    examVariant: text('exam_variant'),
    readingPassageIds: jsonb('reading_passage_ids').$type<string[]>().notNull(),
    listeningTrackIds: jsonb('listening_track_ids').$type<string[]>().notNull(),
    /** Null for a diagnostic — it sits Task 2 only. */
    writingTask1PromptId: uuid('writing_task1_prompt_id').references(
      () => writingPrompts.id,
    ),
    /** Null for a sitting whose content is exam tasks rather than IELTS prompts. */
    writingTask2PromptId: uuid('writing_task2_prompt_id').references(
      () => writingPrompts.id,
    ),
    /** Null only on legacy diagnostics backfilled from the old 2-skill chain. */
    speakingTestId: uuid('speaking_test_id').references(() => speakingTests.id),
    /**
     * An exam-task sitting's content, locked in at the start: every item it
     * will sit, in order. Null for IELTS, whose content is the four columns
     * above. Picked once so a refresh cannot re-pick from a bank that grew.
     */
    taskIds: jsonb('task_ids').$type<string[] | null>(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (t) => [
    index('mock_attempts_user_started_idx').on(t.userId, desc(t.startedAt)),
  ],
);

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

/** Counters written by the practice listening player. `listenedSeconds` is
 * wall-clock time spent playing, so it exceeds the track duration exactly
 * when something was replayed. */
export type ListeningPlayback = {
  pauses: number;
  seeks: number;
  listenedSeconds: number;
};

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    module: attemptModule('module').notNull(),
    kind: attemptKind('kind').notNull().default('practice'),
    status: attemptStatus('status').notNull().default('in_progress'),
    /**
     * Exam, version, variant and task type together say exactly what was sat:
     * `module` is the skill, `kind` + `mock_attempt_id` the sitting. Task
     * types are text so a new exam's tasks need no migration.
     */
    ...examOwnership(),
    examVariant: text('exam_variant'),
    taskType: text('task_type'),
    // Restrict, not set null: content a candidate sat is never deleted out
    // from under their attempt (#120). A trigger also blocks editing it.
    passageId: uuid('passage_id').references(() => passages.id, {
      onDelete: 'restrict',
    }),
    promptId: uuid('prompt_id').references(() => writingPrompts.id, {
      onDelete: 'restrict',
    }),
    trackId: uuid('track_id').references(() => listeningTracks.id, {
      onDelete: 'restrict',
    }),
    speakingTestId: uuid('speaking_test_id').references(
      () => speakingTests.id,
      { onDelete: 'restrict' },
    ),
    /** Set on the writing half of a diagnostic, pointing at the reading half. */
    parentId: uuid('parent_id').references((): AnyPgColumn => attempts.id, {
      onDelete: 'cascade',
    }),
    /** Set on all five sections of a mock sitting, pointing at the mockAttempts row that groups them. */
    mockAttemptId: uuid('mock_attempt_id').references(() => mockAttempts.id, {
      onDelete: 'cascade',
    }),
    rawScore: integer('raw_score'),
    total: integer('total'),
    /**
     * Practice-listening only: what the candidate did with the player. Null
     * for every other module, for mock sittings (whose audio is still
     * single-play), and for every attempt taken before the player existed.
     * Display-only — nothing in grading reads it.
     */
    playback: jsonb('playback').$type<ListeningPlayback | null>(),
    /** The result on the attempt's own exam scale. */
    score: numeric('score', { precision: 5, scale: 1, mode: 'number' }),
    /**
     * The normalised result every grader produces, deterministic or model:
     * score, named dimensions, the skills it counts towards, feedback. Null
     * until marked, and on attempts marked before it existed.
     */
    assessment: jsonb('assessment').$type<AssessmentResult | null>(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
  },
  (t) => [
    // Every dashboard query is "this user's attempts, newest first". Without
    // this the table gets scanned once per page load.
    index('attempts_user_submitted_idx').on(t.userId, desc(t.submittedAt)),
    index('attempts_user_status_idx').on(t.userId, t.status),
    index('attempts_parent_idx').on(t.parentId),
    index('attempts_mock_idx').on(t.mockAttemptId),
  ],
);

export const attemptAnswers = pgTable(
  'attempt_answers',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'restrict' }),
    value: text('value'),
    flagged: boolean('flagged').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.attemptId, t.questionId] }),
    index('attempt_answers_question_idx').on(t.questionId),
  ],
);

/**
 * One candidate answer to one exam task — every exam but IELTS, whose answers
 * stay in `attempt_answers` keyed by its own `questions` table.
 *
 * The shape mirrors `attempt_answers` deliberately, including having no
 * `user_id` of its own: every writer must verify ownership through the attempt
 * first, exactly as `saveAnswer` does. `value` is what the renderer reports —
 * a JSON array when the answer has several parts — and `audio_url` is the
 * uploaded take for a recording task, never a browser object URL.
 */
export const examTaskResponses = pgTable(
  'exam_task_responses',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id')
      .notNull()
      .references(() => examTasks.id, { onDelete: 'restrict' }),
    value: text('value'),
    audioUrl: text('audio_url'),
    flagged: boolean('flagged').notNull().default(false),
    /**
     * When this item's stimulus began: its one audio play started, or — for a
     * task with no audio — the item was first shown. Stamped once, on the
     * server, so a reload or a return to the item cannot replay a single-play
     * recording or restart a preparation window.
     */
    stimulusStartedAt: timestamp('stimulus_started_at', {
      withTimezone: true,
    }),
    /**
     * Stamped when a mock candidate moves past the item. A completed item
     * accepts no further writes, which is what makes mock navigation one-way.
     */
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.attemptId, t.taskId] }),
    index('exam_task_responses_task_idx').on(t.taskId),
  ],
);

export const essays = pgTable('essays', {
  attemptId: uuid('attempt_id')
    .primaryKey()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  body: text('body').notNull().default(''),
  wordCount: integer('word_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Criterion = { name: string; band: number; comment: string };
export type Annotation = {
  quote: string;
  /**
   * `development` is Writing's; `vocabulary` and `fluency` are Speaking's.
   * `good` and `grammar` are shared. Stored as free jsonb, so widening this
   * union is the whole change.
   */
  kind: 'good' | 'grammar' | 'development' | 'vocabulary' | 'fluency';
  comment: string;
};

export const reports = pgTable('reports', {
  attemptId: uuid('attempt_id')
    .primaryKey()
    .references(() => attempts.id, { onDelete: 'cascade' }),
  score: numeric('score', { precision: 5, scale: 1, mode: 'number' }),
  criteria: jsonb('criteria').$type<Criterion[]>().notNull().default([]),
  annotations: jsonb('annotations').$type<Annotation[]>().notNull().default([]),
  strengths: jsonb('strengths').$type<string[]>().notNull().default([]),
  weaknesses: jsonb('weaknesses').$type<string[]>().notNull().default([]),
  /** Which model produced this score. The hedge for switching graders later. */
  model: text('model').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * The finished score report of an exam-task sitting: the one number a
 * candidate is shown for a mock, and the one Today, Progress and the plan read.
 *
 * Written once, when the last expected section attempt has a valid
 * assessment, and never updated — there is no update path in the app. A
 * report assembled on every page load moves when the arithmetic or a re-grade
 * moves, so the historical result a candidate saw would silently change. A
 * sitting still being marked, or with a failed grader, has no row: pending and
 * failed are read off its attempts, and a partial report is never stored.
 *
 * `exam_key`/`exam_version` are the sitting's, never the active exam's.
 */
export const examScoreReports = pgTable(
  'exam_score_reports',
  {
    mockAttemptId: uuid('mock_attempt_id')
      .primaryKey()
      .references(() => mockAttempts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    ...examOwnership(),
    /** `PTE_SCORING_VERSION` and its kin: which arithmetic produced this. */
    scoringVersion: text('scoring_version').notNull(),
    overall: numeric('overall', { precision: 5, scale: 1, mode: 'number' }),
    /** Per skill, on the exam's scale; null where the sitting measured none. */
    subscores: jsonb('subscores')
      .$type<Record<string, number | null>>()
      .notNull(),
    sections: jsonb('sections')
      .$type<Record<string, number | null>>()
      .notNull(),
    /** Raw fraction per task type, weakest first. */
    taskTypes: jsonb('task_types')
      .$type<{ taskType: string; fraction: number }[]>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('exam_score_reports_user_idx').on(
      t.userId,
      t.examKey,
      desc(t.createdAt),
    ),
  ],
);

/**
 * A real score a candidate reports back from the actual exam, paired with what
 * Bandzen had guessed.
 *
 * Deliberately its own table, and deliberately never joined into an estimate:
 * the whole point of collecting these is to compare Bandzen's guess against
 * the truth later, and a column on `reports` would invite something to average
 * the two together.
 *
 * The estimate is frozen here rather than recomputed at comparison time. A
 * sitting's estimate is assembled from its assessments on every page load, so
 * a change to the scoring arithmetic — or a re-grade — silently rewrites what
 * the candidate was actually shown. A calibration row that moved with the code
 * it is meant to calibrate would measure nothing.
 */
export const officialScores = pgTable(
  'official_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    ...examOwnership(),
    score: numeric('score', {
      precision: 5,
      scale: 1,
      mode: 'number',
    }).notNull(),
    takenOn: date('taken_on'),
    /**
     * The sitting this is the truth for. Null when a candidate volunteers a
     * score outside a result page, which is still worth having.
     */
    mockAttemptId: uuid('mock_attempt_id').references(() => mockAttempts.id, {
      onDelete: 'set null',
    }),
    /** What Bandzen estimated for that sitting, as it stood at this moment. */
    estimatedScore: numeric('estimated_score', {
      precision: 5,
      scale: 1,
      mode: 'number',
    }),
    /** The arithmetic that produced it — `PTE_SCORING_VERSION` and its kin. */
    scoringVersion: text('scoring_version'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('official_scores_user_idx').on(t.userId, t.examKey)],
);

/**
 * One recorded answer to a Speaking prompt. The Speaking analogue of
 * `attempt_answers` — uploaded to R2 as the candidate finishes each prompt, so
 * a refresh mid-test loses nothing.
 *
 * `transcript` is filled by Whisper at grading time and only read by the
 * review page; the grader itself hears the audio.
 */
export const speakingResponses = pgTable(
  'speaking_responses',
  {
    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => attempts.id, { onDelete: 'cascade' }),
    promptId: uuid('prompt_id')
      .notNull()
      .references(() => speakingPrompts.id, { onDelete: 'restrict' }),
    audioUrl: text('audio_url').notNull(),
    transcript: text('transcript'),
    durationSeconds: integer('duration_seconds'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.attemptId, t.promptId] })],
);

// ---------------------------------------------------------------------------
// Learning — lessons and resources, editable through the CMS
// ---------------------------------------------------------------------------

export type LessonBlock =
  | { kind: 'prose'; body: string }
  | { kind: 'steps'; items: readonly string[] }
  | { kind: 'checklist'; items: readonly string[] }
  | { kind: 'callout'; tone: 'note' | 'warning'; title: string; body: string }
  | {
      /** The extract being reasoned about. */
      kind: 'example';
      source: string;
      question: string;
      answer: string;
      why: string;
    }
  | {
      /** A question the reader answers in their head before revealing. */
      kind: 'try';
      source?: string;
      question: string;
      answer: string;
      why: string;
    }
  | {
      /** An embeddable video URL (e.g. a YouTube/Vimeo embed link). */
      kind: 'video';
      url: string;
      title?: string;
    };

/** The six stages every lesson moves through, in order. */
export const LESSON_STAGES = [
  'understand',
  'see',
  'try',
  'practice',
  'check',
  'improve',
] as const;

export type LessonStageId = (typeof LESSON_STAGES)[number];

export const STAGE_TITLE: Record<LessonStageId, string> = {
  understand: 'Understand',
  see: 'See',
  try: 'Try',
  practice: 'Practice',
  check: 'Check',
  improve: 'Improve',
};

export type LessonStage = {
  id: LessonStageId;
  blocks: readonly LessonBlock[];
};

export const GROUP_TITLE: Record<
  (typeof lessonGroup.enumValues)[number],
  string
> = {
  foundations: 'Foundations',
  'question-types': 'Question types',
  advanced: 'Advanced',
};

export const CATEGORY_TITLE: Record<
  (typeof resourceCategory.enumValues)[number],
  string
> = {
  strategies: 'Strategies',
  reading: 'Reading',
  writing: 'Writing',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  'exam-day': 'Exam day',
  listening: 'Listening',
  speaking: 'Speaking',
};

export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    ...examOwnership(),
    module: attemptModule('module').notNull(),
    group: lessonGroup('group').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    minutes: integer('minutes').notNull(),
    /** The question kind this teaches, where it maps to one. Links to practice. */
    questionKind: questionKind('question_kind'),
    /** Absent/null means the lesson is planned but unwritten. */
    stages: jsonb('stages').$type<LessonStage[] | null>(),
    /** Display order within a module+group. Was implicit array order before this table existed. */
    orderIndex: integer('order_index').notNull().default(0),
    status: contentStatus('status').notNull().default('published'),
    updatedBy: uuid('updated_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('lessons_module_group_idx').on(t.module, t.group, t.orderIndex),
  ],
);

export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  ...examOwnership(),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  category: resourceCategory('category').notNull(),
  level: resourceLevel('level').notNull(),
  minutes: integer('minutes').notNull(),
  /** The module this belongs to, where it maps to one we can practise. */
  module: attemptModule('module'),
  questionKind: questionKind('question_kind'),
  /** Paragraphs. Absent/null means listed but not yet drafted. */
  body: jsonb('body').$type<string[] | null>(),
  orderIndex: integer('order_index').notNull().default(0),
  status: contentStatus('status').notNull().default('published'),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Which lessons a candidate has finished. */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: uuid('user_id').notNull(),
    lessonId: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/**
 * Awards a candidate has earned. The rule lives in `apps/app/src/lib/awards.ts`
 * and derives from `attempts` and `lesson_progress`, so this table is the
 * record rather than the rule — the exception the "derived, not stored" section
 * of the app README asks for. It holds the two facts the event log cannot: that
 * an award was earned under the rules in force at the time, so tightening one
 * later cannot un-earn it, and whether the candidate has been told about it.
 */
export const awards = pgTable(
  'awards',
  {
    userId: uuid('user_id').notNull(),
    /** A catalogue slug, not an FK — the catalogue is code, not rows. */
    awardId: text('award_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Null until the dashboard strip has been acknowledged. */
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
  },
  // The composite key is what makes recording an award idempotent, which is
  // the whole reason a missed write can heal itself on the next activity.
  (t) => [primaryKey({ columns: [t.userId, t.awardId] })],
);

/**
 * A CMS audit trail: who did what to which piece of content, and when. No FK
 * to the content tables — a `deleted` event outlives the row it names, and the
 * entity is polymorphic (its `entityType` is a ContentType string). Rows are
 * append-only; nothing updates or deletes them.
 */
export const contentEvents = pgTable(
  'content_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    /** Who made the change; null for pre-audit backfill. */
    actorId: uuid('actor_id'),
    action: contentEventAction('action').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('content_events_entity_idx').on(
      t.entityType,
      t.entityId,
      desc(t.createdAt),
    ),
  ],
);

// ---------------------------------------------------------------------------
// AI usage
// ---------------------------------------------------------------------------

/**
 * One row per model call, written by `@bandzen/ai`'s runtime.
 *
 * **Metadata only.** No prompt, no completion, no student text ever lands here.
 * What is durable is the token counts; `estimatedCostUsd` is a derived number
 * that was true under `pricingVersion` and may not be true now, which is why
 * both columns exist rather than just the dollars.
 *
 * Neither id is a foreign key. Content generation has no user and no attempt,
 * and a telemetry row must never be the thing that blocks deleting a profile
 * or an attempt. Rows are append-only; nothing updates them.
 */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * Set by the Coach and Tutor, which run inside a request that knows who is
     * asking. Null for the graders — `gradeEssay`/`gradeSpeaking` deliberately
     * take no userId, so they set `attemptId` instead and the cost script joins
     * `attempts` for the user.
     */
    userId: uuid('user_id'),
    attemptId: uuid('attempt_id'),
    feature: aiFeature('feature').notNull(),
    /** The model actually called, not the constant's current value. */
    model: text('model').notNull(),
    /** OpenAI's `_request_id`. Null where the SDK does not surface one — the Agents SDK does not. */
    requestId: text('request_id'),
    /** Ours, always set, so every call is identifiable even without the above. */
    traceId: text('trace_id').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    cachedInputTokens: integer('cached_input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    /** Billed as output. Broken out because a model whose reasoning default changes can silently double the bill. */
    reasoningTokens: integer('reasoning_tokens').notNull().default(0),
    /** Audio models only: 10 tokens/second of input audio, flat. Null elsewhere. */
    audioInputTokens: integer('audio_input_tokens'),
    toolCalls: integer('tool_calls').notNull().default(0),
    latencyMs: integer('latency_ms').notNull(),
    status: aiStatus('status').notNull(),
    errorCode: text('error_code'),
    estimatedCostUsd: numeric('estimated_cost_usd', {
      precision: 10,
      scale: 6,
      mode: 'number',
    }),
    /** Which price table produced `estimatedCostUsd`. Prices change; this says which ones applied. */
    pricingVersion: text('pricing_version').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('ai_usage_feature_created_idx').on(t.feature, desc(t.createdAt)),
    index('ai_usage_user_created_idx').on(t.userId, desc(t.createdAt)),
    index('ai_usage_attempt_idx').on(t.attemptId),
  ],
);

/** The IELTS modules that can create an attempts row, as a plain union for code that never touches the DB. */
export type Skill = (typeof attemptModule.enumValues)[number];

export type Passage = typeof passages.$inferSelect;
export type ListeningTrack = typeof listeningTracks.$inferSelect;
export type SpeakingTest = typeof speakingTests.$inferSelect;
export type SpeakingPrompt = typeof speakingPrompts.$inferSelect;
export type SpeakingResponse = typeof speakingResponses.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type WritingPrompt = typeof writingPrompts.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type MockAttempt = typeof mockAttempts.$inferSelect;
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type ExamEnrollment = typeof examEnrollments.$inferSelect;
export type ExamTask = typeof examTasks.$inferSelect;
export type ExamTaskResponse = typeof examTaskResponses.$inferSelect;
export type OfficialScore = typeof officialScores.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type Award = typeof awards.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ContentStatus = (typeof contentStatus.enumValues)[number];
export type LessonGroupValue = (typeof lessonGroup.enumValues)[number];
export type ResourceCategory = (typeof resourceCategory.enumValues)[number];
export type ResourceLevel = (typeof resourceLevel.enumValues)[number];
export type ContentEvent = typeof contentEvents.$inferSelect;
export type ContentEventAction = (typeof contentEventAction.enumValues)[number];
