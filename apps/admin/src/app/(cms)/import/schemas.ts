import { z } from 'zod';

/**
 * What an import file is allowed to contain, for each kind of content.
 *
 * The templates a human copies live next door in ./templates.ts, which imports
 * these schemas so its worked examples can be checked against them.
 *
 * Deliberately free of every database import, so `schemas.test.ts` can run
 * under `node --test` without a `DATABASE_URL` or a React Server Component
 * around it. The half that writes rows lives in ./registry.ts.
 *
 * The enum members below are hand-mirrored from `packages/db`'s pgEnums rather
 * than imported, following the same call made for the original passage import
 * schema. Keep them in step with the schema; the tests parse the real files in
 * `apps/app/content/`, so a drift on the passage and prompt side fails loudly.
 */

/** One import writes at most this many rows. See the note in ./actions.ts. */
export const MAX_ITEMS = 50;

const QUESTION_KINDS = [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
] as const;

/** The full `question_kind` enum — the listening editor and import allow any. */
const ALL_QUESTION_KINDS = [...QUESTION_KINDS, 'matching'] as const;

const LESSON_STAGE_IDS = [
  'understand',
  'see',
  'try',
  'practice',
  'check',
  'improve',
] as const;

const MODULES = ['reading', 'writing'] as const;
const FORMATS = ['academic', 'general'] as const;
const LESSON_GROUPS = ['foundations', 'question-types', 'advanced'] as const;
const RESOURCE_CATEGORIES = [
  'strategies',
  'reading',
  'writing',
  'vocabulary',
  'grammar',
  'exam-day',
  'listening',
  'speaking',
] as const;
const RESOURCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const slug = z.string().min(1);

// ---------------------------------------------------------------------------
// Passages
// ---------------------------------------------------------------------------

/**
 * Mirrors `apps/app/src/lib/ai/schemas.ts`'s `generatedPassageSchema` — the
 * shape `scripts/generate-content.mts` produces for a human to review before
 * seeding — plus the optional `format` the table carries but the generator
 * never sets.
 */
export const passageSchema = z.object({
  slug,
  title: z.string(),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  format: z.enum(FORMATS).optional(),
  body: z.string(),
  headings: z.array(z.string()),
  questions: z.array(
    z.object({
      idx: z.number().int(),
      kind: z.enum(QUESTION_KINDS),
      prompt: z.string(),
      options: z.array(z.string()).nullable(),
      answer: z.array(z.string()),
      evidence: z.string(),
      explanation: z.string(),
    }),
  ),
});

// ---------------------------------------------------------------------------
// Listening tracks
// ---------------------------------------------------------------------------

/**
 * Mirrors `apps/app/src/lib/ai/schemas.ts`'s `generatedListeningTrackSchema`
 * — what `scripts/generate-listening-content.mts` produces — plus the
 * `audioUrl` the synthesize step writes back into the same file.
 *
 * `transcript` and `audioUrl` are each optional, but at least one is required:
 * the CMS generates the other after import (TTS, or Whisper), the same way the
 * New-track form does. `questions` may be omitted for an audio-only row — they
 * can't be written until the transcript exists.
 */
export const listeningTrackSchema = z
  .object({
    slug,
    title: z.string(),
    topic: z.string(),
    difficulty: z.number().int().min(1).max(5),
    transcript: z.string().optional(),
    audioUrl: z.string().min(1).optional(),
    matchingOptions: z.array(z.string()).nullish(),
    questions: z
      .array(
        z.object({
          idx: z.number().int(),
          kind: z.enum(ALL_QUESTION_KINDS),
          prompt: z.string(),
          options: z.array(z.string()).nullable(),
          answer: z.array(z.string()),
          evidence: z.string(),
          explanation: z.string(),
        }),
      )
      .default([]),
  })
  .refine((t) => !!t.transcript || !!t.audioUrl, {
    message: 'provide a transcript or an audioUrl',
    path: ['transcript'],
  });

// ---------------------------------------------------------------------------
// Speaking tests
// ---------------------------------------------------------------------------

/**
 * Mirrors what `apps/app/scripts/generate-speaking-content.mts` writes: the
 * three parts flattened to one ordered `prompts` array. `audioUrl` is the
 * examiner voice the synthesize step fills in; a row without it imports fine
 * and the CMS generates the rest when the draft is opened.
 */
export const speakingTestSchema = z.object({
  slug,
  title: z.string(),
  topic: z.string(),
  difficulty: z.number().int().min(1).max(5),
  prompts: z
    .array(
      z.object({
        idx: z.number().int(),
        part: z.number().int().min(1).max(3),
        text: z.string(),
        cueCardPoints: z.array(z.string()).nullish(),
        prepSeconds: z.number().int().min(0).default(0),
        audioUrl: z.string().min(1).optional(),
      }),
    )
    .min(1),
});

// ---------------------------------------------------------------------------
// Writing prompts
// ---------------------------------------------------------------------------

export const writingPromptSchema = z.object({
  slug,
  task: z.number().int().min(1).max(2),
  format: z.enum(FORMATS).optional(),
  promptText: z.string(),
  /** The Task 1 chart blob. Opaque — nothing renders it yet. */
  chartData: z.unknown().optional(),
});

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

const lessonBlockSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('prose'), body: z.string() }),
  z.object({ kind: z.literal('steps'), items: z.array(z.string()) }),
  z.object({ kind: z.literal('checklist'), items: z.array(z.string()) }),
  z.object({
    kind: z.literal('callout'),
    tone: z.enum(['note', 'warning']),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    kind: z.literal('example'),
    source: z.string(),
    question: z.string(),
    answer: z.string(),
    why: z.string(),
  }),
  z.object({
    kind: z.literal('try'),
    source: z.string().optional(),
    question: z.string(),
    answer: z.string(),
    why: z.string(),
  }),
]);

export const lessonSchema = z.object({
  slug,
  module: z.enum(MODULES),
  group: z.enum(LESSON_GROUPS),
  title: z.string(),
  summary: z.string(),
  minutes: z.number().int().min(1),
  questionKind: z.enum(QUESTION_KINDS).nullish(),
  orderIndex: z.number().int().optional(),
  /** Null or absent is a real state: a lesson listed but not yet written. */
  stages: z
    .array(
      z.object({
        id: z.enum(LESSON_STAGE_IDS),
        blocks: z.array(lessonBlockSchema),
      }),
    )
    .nullish(),
});

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export const resourceSchema = z.object({
  slug,
  title: z.string(),
  summary: z.string(),
  category: z.enum(RESOURCE_CATEGORIES),
  level: z.enum(RESOURCE_LEVELS),
  minutes: z.number().int().min(1),
  module: z.enum(MODULES).nullish(),
  questionKind: z.enum(QUESTION_KINDS).nullish(),
  orderIndex: z.number().int().optional(),
  /** Paragraphs. Null or absent means listed but not yet drafted. */
  body: z.array(z.string()).nullish(),
});

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export type ParseResult<T> = { error: string } | { items: T[] };

/**
 * One item or an array of them, either way an array out.
 *
 * A bare object is accepted because that is exactly what
 * `apps/app/content/passages/*.json` holds — one passage per file — and those
 * files predate this importer.
 */
export function parseItems<T>(
  schema: z.ZodType<T>,
  json: unknown,
): ParseResult<T> {
  const wasSingle = !Array.isArray(json);
  const items = wasSingle ? [json] : json;

  if (items.length === 0) return { error: 'That file has nothing in it.' };
  if (items.length > MAX_ITEMS) {
    return {
      error: `That file has ${items.length} items; import at most ${MAX_ITEMS} at a time.`,
    };
  }

  const parsed = z.array(schema).safeParse(items);
  if (parsed.success) return { items: parsed.data };

  const issues = parsed.error.issues.map((i) => {
    // A bare object still reports under index 0; say "slug", not "0.slug".
    const path = wasSingle ? i.path.slice(1) : i.path;
    return `${path.join('.') || '(root)'}: ${i.message}`;
  });
  const shown = issues.slice(0, 8).join('; ');
  return {
    error:
      issues.length > 8
        ? `${shown}; …and ${issues.length - 8} more`
        : shown || 'That JSON does not match the template.',
  };
}

/** Slugs that already exist, or that the file repeats. Empty means go ahead. */
export function findSlugClashes(slugs: string[], existing: Set<string>) {
  const seen = new Set<string>();
  const clashes = new Set<string>();
  for (const s of slugs) {
    if (existing.has(s) || seen.has(s)) clashes.add(s);
    seen.add(s);
  }
  return [...clashes];
}
