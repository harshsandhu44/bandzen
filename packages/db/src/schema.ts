import { desc } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/**
 * The source of truth for both the schema and every TypeScript type derived
 * from it. Change a column here, run `pnpm db:generate`, and the migration and
 * the types move together — nothing is hand-maintained.
 *
 * User ids are Clerk's (`user_2ab...`), so they are text, not uuid, and there
 * is no users table here for them to reference. Clerk owns identity.
 */

export const testFormat = pgEnum('test_format', ['academic', 'general']);

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

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/**
 * Everything about a user that is ours rather than Clerk's. Created lazily on
 * first write — there is no auth trigger to hang creation off any more.
 */
export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  /** Which exam they are sitting. Reuses the enum the content tables already use. */
  examType: testFormat('exam_type'),
  targetBand: numeric('target_band', {
    precision: 2,
    scale: 1,
    mode: 'number',
  }),
  testDate: date('test_date'),
  /**
   * What the candidate says their level is at sign-up. Null is a real answer —
   * "I don't know" is the case the diagnostic exists for — so it stays
   * separate from the measured bands, which only ever come from attempts.
   */
  selfAssessedBand: numeric('self_assessed_band', {
    precision: 2,
    scale: 1,
    mode: 'number',
  }),
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
 * The landing page's "no invite code?" path. Clerk owns the actual gate
 * (Restricted sign-up + Clerk Invitations); this is only demand capture.
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
 * What a candidate has paid for, mirrored from Razorpay.
 *
 * Razorpay owns the truth; this is a local copy the webhook keeps current, so
 * rendering a page never depends on their API being reachable. One row per
 * user — resubscribing reuses it.
 *
 * `status` is text rather than an enum on purpose: the values are Razorpay's,
 * and a state we have not seen before should not turn into a failed insert on
 * a webhook we cannot replay.
 *
 * A grant — the founding cohort, or a new candidate's trial — is a row with a
 * future `current_period_end` and no `razorpay_subscription_id`. That is the
 * whole mechanism, and it is why entitlement is one date comparison rather
 * than a status matrix.
 */
export const subscriptions = pgTable('subscriptions', {
  userId: text('user_id').primaryKey(),
  /** Null for a grant; `sub_…` for anything Razorpay charged for. */
  razorpaySubscriptionId: text('razorpay_subscription_id'),
  /** A Razorpay plan id, or `trial` / `founding` for a grant. */
  planId: text('plan_id').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end', {
    withTimezone: true,
  }).notNull(),
  /** Which prompt earned this, from `/upgrade?from=…`. The only attribution. */
  source: text('source'),
  /**
   * When Razorpay created the event this row was last written from.
   *
   * Razorpay delivers at-least-once and does not promise order, so a replay of
   * an old `subscription.charged` could otherwise re-extend an account that
   * has since been cancelled or refunded. An event older than this one is
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
    userId: text('user_id').notNull(),
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
  format: testFormat('format').notNull().default('academic'),
  difficulty: integer('difficulty').notNull().default(3),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: text('updated_by'),
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

export const writingPrompts = pgTable('writing_prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  task: integer('task').notNull(),
  format: testFormat('format').notNull().default('academic'),
  promptText: text('prompt_text').notNull(),
  chartData: jsonb('chart_data'),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: text('updated_by'),
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
  title: text('title').notNull(),
  topic: text('topic'),
  transcript: text('transcript'),
  audioUrl: text('audio_url'),
  /** Shared option list for this track's `matching` questions — same role as passages.headings. */
  matchingOptions: jsonb('matching_options').$type<string[] | null>(),
  /** Downsampled amplitude peaks (0-1) for the runner's waveform display. Computed once alongside audioUrl. */
  peaks: jsonb('peaks').$type<number[] | null>(),
  /** Last CMS generation failure (TTS or transcription). Null once it succeeds. */
  generationError: text('generation_error'),
  /** Set while a CMS generation is in flight, so a page refresh can't start a second. Cleared on settle. */
  generationStartedAt: timestamp('generation_started_at', {
    withTimezone: true,
  }),
  difficulty: integer('difficulty').notNull().default(3),
  /** New rows default to 'published' — draft is set explicitly by the CMS on create. */
  status: contentStatus('status').notNull().default('published'),
  updatedBy: text('updated_by'),
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
  updatedBy: text('updated_by'),
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

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export const attempts = pgTable(
  'attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(),
    module: attemptModule('module').notNull(),
    kind: attemptKind('kind').notNull().default('practice'),
    status: attemptStatus('status').notNull().default('in_progress'),
    passageId: uuid('passage_id').references(() => passages.id, {
      onDelete: 'set null',
    }),
    promptId: uuid('prompt_id').references(() => writingPrompts.id, {
      onDelete: 'set null',
    }),
    trackId: uuid('track_id').references(() => listeningTracks.id, {
      onDelete: 'set null',
    }),
    speakingTestId: uuid('speaking_test_id').references(
      () => speakingTests.id,
      { onDelete: 'set null' },
    ),
    /** Set on the writing half of a diagnostic, pointing at the reading half. */
    parentId: uuid('parent_id').references((): AnyPgColumn => attempts.id, {
      onDelete: 'cascade',
    }),
    rawScore: integer('raw_score'),
    total: integer('total'),
    band: numeric('band', { precision: 2, scale: 1, mode: 'number' }),
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
      .references(() => questions.id, { onDelete: 'cascade' }),
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
  band: numeric('band', { precision: 2, scale: 1, mode: 'number' }).notNull(),
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
      .references(() => speakingPrompts.id, { onDelete: 'cascade' }),
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
    updatedBy: text('updated_by'),
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
  updatedBy: text('updated_by'),
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
    userId: text('user_id').notNull(),
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
    userId: text('user_id').notNull(),
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
    /** Clerk userId of whoever made the change; null for pre-audit backfill. */
    actorId: text('actor_id'),
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
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
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
