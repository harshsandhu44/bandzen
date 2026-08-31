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
]);

export const attemptModule = pgEnum('attempt_module', ['reading', 'writing']);
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    passageId: uuid('passage_id')
      .notNull()
      .references(() => passages.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    kind: questionKind('kind').notNull(),
    prompt: text('prompt').notNull(),
    /** Choices for multiple_choice / matching_headings; null otherwise. */
    options: jsonb('options').$type<string[] | null>(),
    /** The sentence that justifies the answer. Powers review mode. */
    evidence: text('evidence'),
    explanation: text('explanation'),
  },
  (t) => [uniqueIndex('questions_passage_idx_key').on(t.passageId, t.idx)],
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  kind: 'good' | 'grammar' | 'development';
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

// ---------------------------------------------------------------------------
// Learning
// ---------------------------------------------------------------------------

/**
 * Which lessons a candidate has finished. Lesson bodies are authored TypeScript
 * in `src/content/lessons.ts`, not rows — editing a sentence should be a diff a
 * reviewer can read, not a migration. So `lessonId` is that module's slug and
 * carries no foreign key; a lesson that is deleted leaves a harmless orphan.
 */
export const lessonProgress = pgTable(
  'lesson_progress',
  {
    userId: text('user_id').notNull(),
    lessonId: text('lesson_id').notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.lessonId] })],
);

/** The two v1 modules, as a plain union for code that never touches the DB. */
export type Skill = (typeof attemptModule.enumValues)[number];

export type Passage = typeof passages.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type WritingPrompt = typeof writingPrompts.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
