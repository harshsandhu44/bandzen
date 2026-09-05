import { z } from 'zod';

/**
 * Every contract we hold a model to, defined once.
 *
 * These are the source of truth for both directions: `strictJsonSchema()`
 * turns them into the JSON Schema the request carries, and `parseStructured()`
 * validates the response against the same object. Nothing is hand-mirrored, so
 * the two can't drift.
 *
 * Optionality is expressed as `.nullable()`, never `.optional()` — OpenAI's
 * strict mode requires every property to be listed as required.
 */

export const CRITERION_NAMES = [
  'Task Response',
  'Coherence and Cohesion',
  'Lexical Resource',
  'Grammatical Range and Accuracy',
] as const;

export const writingEvaluationSchema = z.object({
  band: z.number().describe('Overall band, 0-9, whole or half.'),
  criteria: z.array(
    z.object({
      name: z.enum(CRITERION_NAMES),
      band: z.number(),
      comment: z.string(),
    }),
  ),
  annotations: z.array(
    z.object({
      quote: z.string().describe('Verbatim extract from the response.'),
      kind: z.enum(['good', 'grammar', 'development']),
      comment: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type WritingEvaluation = z.infer<typeof writingEvaluationSchema>;

/**
 * One generated Reading passage with its questions and answer keys.
 *
 * Shared with `scripts/generate-content.mts`, which imports it by relative
 * path — the kind list and the schema were previously two copies of the same
 * thing on either side of a boundary the script could not cross.
 *
 * The `.describe()` calls are not documentation. They are shipped to the model
 * as part of the schema and carry the IELTS rules the SYSTEM prompt cannot
 * enforce structurally, so edit them as you would edit a prompt.
 */
export const QUESTION_KINDS = [
  'true_false_not_given',
  'yes_no_not_given',
  'multiple_choice',
  'matching_headings',
  'sentence_completion',
] as const;

export const generatedQuestionSchema = z.object({
  idx: z.int(),
  kind: z.enum(QUESTION_KINDS),
  prompt: z.string(),
  options: z
    .array(z.string())
    .nullable()
    .describe(
      'Choices for multiple_choice ONLY. Must be null for matching_headings, which draws from the passage-level headings list.',
    ),
  answer: z
    .array(z.string())
    .describe(
      'Accepted answers. One entry normally; more only where the passage genuinely supports a synonym.',
    ),
  evidence: z
    .string()
    .describe(
      'The exact sentence from body that justifies the answer, verbatim.',
    ),
  explanation: z.string(),
});

export const generatedPassageSchema = z.object({
  slug: z.string().describe('kebab-case, unique'),
  title: z.string(),
  topic: z.string(),
  difficulty: z.int().min(1).max(5),
  body: z
    .string()
    .describe(
      '700-900 words of academic prose, split into paragraphs each prefixed with a capital letter label and a newline, e.g. "A\\nThe first paragraph...".',
    ),
  headings: z
    .array(z.string())
    .describe(
      'One shared list of candidate headings covering every matching_headings question, with at least three MORE headings than there are such questions. Every heading must be a plausible summary of some part of this passage.',
    ),
  questions: z.array(generatedQuestionSchema),
});

export type GeneratedPassage = z.infer<typeof generatedPassageSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

/**
 * One generated Listening track — a transcript plus its questions, with no
 * audio yet. Shared with `scripts/generate-listening-content.mts`.
 *
 * Only the three question kinds real Listening actually uses: T/F/NG and
 * matching_headings are Reading-specific (the latter needs a passage's
 * paragraphs, which a spoken track has none of).
 */
export const LISTENING_QUESTION_KINDS = [
  'multiple_choice',
  'sentence_completion',
  'matching',
] as const;

export const generatedListeningQuestionSchema = z.object({
  idx: z.int(),
  kind: z.enum(LISTENING_QUESTION_KINDS),
  prompt: z.string(),
  options: z
    .array(z.string())
    .nullable()
    .describe(
      'Choices for multiple_choice ONLY. Must be null for matching, which draws from the track-level matchingOptions list.',
    ),
  answer: z
    .array(z.string())
    .describe(
      'Accepted answers. One entry normally; more only where the transcript genuinely supports a synonym.',
    ),
  evidence: z
    .string()
    .describe(
      'The exact line(s) from transcript that justify the answer, verbatim.',
    ),
  explanation: z.string(),
});

export const generatedListeningTrackSchema = z.object({
  slug: z.string().describe('kebab-case, unique'),
  title: z.string(),
  topic: z.string(),
  difficulty: z.int().min(1).max(5),
  transcript: z
    .string()
    .describe(
      '350-450 words of spoken script (a monologue or a conversation between clearly labelled speakers), on a everyday or academic topic a real IELTS Listening section would use.',
    ),
  matchingOptions: z
    .array(z.string())
    .nullable()
    .describe(
      'One shared list of options covering every `matching` question, with at least three MORE options than there are such questions, or null if the track has no matching questions.',
    ),
  questions: z.array(generatedListeningQuestionSchema),
});

export type GeneratedListeningTrack = z.infer<
  typeof generatedListeningTrackSchema
>;
export type GeneratedListeningQuestion = z.infer<
  typeof generatedListeningQuestionSchema
>;

// ---------------------------------------------------------------------------
// Speaking
// ---------------------------------------------------------------------------

/**
 * The IELTS Speaking assessment criteria, each 0-9. The overall band is their
 * mean, rounded to the nearest half band — the same rule as Writing.
 */
export const SPEAKING_CRITERION_NAMES = [
  'Fluency and Coherence',
  'Lexical Resource',
  'Grammatical Range and Accuracy',
  'Pronunciation',
] as const;

/**
 * The grader's report on one Speaking test. Same shape as
 * `writingEvaluationSchema` so it writes to the same `reports` table and the
 * report page can share its rendering.
 *
 * Annotation `quote`s are lifted from the Whisper transcripts of the answers;
 * `grade-speaking.ts` drops any that do not appear verbatim, exactly as the
 * essay grader does.
 */
export const speakingEvaluationSchema = z.object({
  band: z.number().describe('Overall band, 0-9, whole or half.'),
  criteria: z.array(
    z.object({
      name: z.enum(SPEAKING_CRITERION_NAMES),
      band: z.number(),
      comment: z.string(),
    }),
  ),
  annotations: z.array(
    z.object({
      quote: z
        .string()
        .describe('Verbatim extract from what the candidate said.'),
      kind: z.enum(['good', 'grammar', 'vocabulary', 'fluency']),
      comment: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export type SpeakingEvaluation = z.infer<typeof speakingEvaluationSchema>;

/**
 * One generated Speaking test — the three parts, no audio yet. Shared with
 * `scripts/generate-speaking-content.mts`.
 *
 * `.describe()` strings carry the IELTS format rules and are shipped to the
 * model as part of the schema — edit them as you would a prompt.
 */
const generatedSpeakingQuestionSchema = z.object({
  idx: z.int().describe('Ordering within the whole test, starting at 1.'),
  text: z.string(),
});

export const generatedSpeakingTestSchema = z.object({
  slug: z.string().describe('kebab-case, unique'),
  title: z.string(),
  topic: z.string(),
  difficulty: z.int().min(1).max(5),
  part1: z
    .array(generatedSpeakingQuestionSchema)
    .describe(
      '3-4 short personal questions on one familiar topic (home, work, study, hobbies), the kind that open a real IELTS interview.',
    ),
  part2: z
    .object({
      cueCard: z
        .string()
        .describe(
          'The "Describe a ..." task line the candidate speaks to for 1-2 minutes.',
        ),
      points: z
        .array(z.string())
        .describe(
          'The 3-4 "You should say:" bullet points printed on the cue card.',
        ),
    })
    .describe('The Part 2 long turn. One cue card. prep_seconds is 60.'),
  part3: z
    .array(generatedSpeakingQuestionSchema)
    .describe(
      '4-6 abstract discussion questions thematically linked to the Part 2 topic — opinion, comparison, speculation.',
    ),
});

export type GeneratedSpeakingTest = z.infer<typeof generatedSpeakingTestSchema>;

// ---------------------------------------------------------------------------
// Content-file schemas — what a reviewed JSON file (from the offline pipeline
// or a hand-prompted model) is allowed to contain, per content type.
//
// These were hand-mirrored in apps/admin's import/schemas.ts; they live here
// now so there is one copy. The passage schema derives from the generator
// schema above; the others are written out because their file shape diverges
// from what the model returns (a track may arrive audio-only, a speaking test
// is flattened to one prompts array).
// ---------------------------------------------------------------------------

/** One import writes at most this many rows. */
export const MAX_ITEMS = 50;

const FORMATS = ['academic', 'general'] as const;
const MODULES = ['reading', 'writing'] as const;
const LESSON_GROUPS = ['foundations', 'question-types', 'advanced'] as const;
const LESSON_STAGE_IDS = [
  'understand',
  'see',
  'try',
  'practice',
  'check',
  'improve',
] as const;
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

/** Reading + Listening question kinds, for the importers that allow any. */
const ALL_QUESTION_KINDS = [
  ...QUESTION_KINDS,
  ...LISTENING_QUESTION_KINDS,
] as const;

const slug = z.string().min(1);

/** Passages: the generator's shape plus the optional `format` the table carries. */
export const passageSchema = generatedPassageSchema.extend({
  slug,
  format: z.enum(FORMATS).optional(),
});

/**
 * Listening: the generator's shape, loosened — a file may carry a transcript,
 * an audioUrl, or both (the CMS derives whichever is missing), and its
 * questions may be absent until the transcript exists.
 */
export const listeningTrackSchema = generatedListeningTrackSchema
  .extend({
    slug,
    transcript: z.string().optional(),
    audioUrl: z.string().min(1).optional(),
    matchingOptions: z.array(z.string()).nullish(),
    questions: z.array(generatedListeningQuestionSchema).default([]),
  })
  .refine((t) => !!t.transcript || !!t.audioUrl, {
    message: 'provide a transcript or an audioUrl',
    path: ['transcript'],
  });

/** Speaking: the three parts flattened to one ordered `prompts` array. */
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

/**
 * Task 1's figure. `prompt-chart.tsx` renders either shape — `points` is what
 * new content should use; `categories`/`values` is an earlier shape already
 * sitting in real rows, still accepted here so existing content re-imports
 * cleanly rather than being rejected by a schema written after the fact.
 */
const writingChartDataSchema = z.union([
  z.object({
    kind: z.enum(['line', 'bar']),
    title: z.string(),
    unit: z.string().optional(),
    xLabel: z.string().optional(),
    series: z
      .array(
        z.object({
          name: z.string(),
          points: z
            .array(z.tuple([z.union([z.number(), z.string()]), z.number()]))
            .min(1),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.enum(['bar', 'pie']),
    title: z.string(),
    unit: z.string().optional(),
    categories: z.array(z.string()).optional(),
    series: z
      .array(
        z.object({
          name: z.string(),
          values: z.union([
            z.array(z.number()),
            z.record(z.string(), z.number()),
          ]),
        }),
      )
      .min(1),
  }),
]);

export const writingPromptSchema = z.object({
  slug,
  task: z.number().int().min(1).max(2),
  format: z.enum(FORMATS).optional(),
  promptText: z.string(),
  chartData: writingChartDataSchema.optional(),
});

export const lessonBlockSchema = z.discriminatedUnion('kind', [
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
  stages: z
    .array(
      z.object({
        id: z.enum(LESSON_STAGE_IDS),
        blocks: z.array(lessonBlockSchema),
      }),
    )
    .nullish(),
});

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
  body: z.array(z.string()).nullish(),
});

export type ParseResult<T> = { error: string } | { items: T[] };

/** One item or an array of them, either way an array out (see MAX_ITEMS). */
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

void ALL_QUESTION_KINDS;
