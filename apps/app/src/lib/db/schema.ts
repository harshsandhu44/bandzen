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
  targetBand: numeric('target_band', {
    precision: 2,
    scale: 1,
    mode: 'number',
  }),
  testDate: date('test_date'),
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

/** The two v1 modules, as a plain union for code that never touches the DB. */
export type Skill = (typeof attemptModule.enumValues)[number];

export type Passage = typeof passages.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type WritingPrompt = typeof writingPrompts.$inferSelect;
export type Attempt = typeof attempts.$inferSelect;
export type AttemptAnswer = typeof attemptAnswers.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
