/**
 * Content generation: topic in, a reviewed-shape object out. One code path for
 * the offline scripts and the in-app "Generate with AI" flow.
 *
 * Each generator returns `{ data, warnings }`. Strict Structured Outputs
 * guarantees the shape; `warnings` are the cheap structural checks the model
 * can still get wrong (evidence not verbatim, too few headings) — surfaced for
 * a human to fix before publishing, never fatal.
 */
import { z } from 'zod';
import { openai } from './client.ts';
import { CONTENT_MODEL } from './models.ts';
import { parseStructured, strictJsonSchema } from './structured.ts';
import {
  generatedPassageSchema,
  generatedListeningTrackSchema,
  generatedSpeakingTestSchema,
  speakingTestSchema,
  type GeneratedPassage,
  type GeneratedListeningTrack,
} from './schemas.ts';
import { PASSAGE_SYSTEM, LISTENING_SYSTEM, SPEAKING_SYSTEM } from './prompts.ts';

export type GenResult<T> = { data: T; warnings: string[] };
export type GenOptions = {
  topic?: string;
  difficulty?: number;
  /** Slugs already in the bank, so the model picks something new. */
  avoid?: string[];
};

export type SpeakingTestFile = z.infer<typeof speakingTestSchema>;

async function call<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
): Promise<T> {
  const response = await openai().chat.completions.create({
    model: CONTENT_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'content',
        strict: true,
        schema: strictJsonSchema(schema),
      },
    },
  });
  return parseStructured(response, schema);
}

function userLine(base: string, o: GenOptions) {
  const parts = [base];
  parts.push(o.topic ? `Topic: ${o.topic}.` : 'Choose a fresh topic.');
  if (o.difficulty) parts.push(`Target difficulty ${o.difficulty} of 5.`);
  if (o.avoid?.length)
    parts.push(`Pick something unlike any of these: ${o.avoid.join(', ')}.`);
  return parts.join(' ');
}

// --- passages --------------------------------------------------------------

export function validatePassage(p: GeneratedPassage): string[] {
  const problems: string[] = [];
  const words = p.body.split(/\s+/).length;
  if (words < 600) problems.push(`body only ${words} words`);
  if (p.questions.length !== 13)
    problems.push(`${p.questions.length} questions, expected 13`);

  const headingQs = p.questions.filter((q) => q.kind === 'matching_headings');
  const used = new Set<string>();
  if (headingQs.length) {
    if (p.headings.length < headingQs.length + 3)
      problems.push(
        `${p.headings.length} headings for ${headingQs.length} questions, want at least ${headingQs.length + 3}`,
      );
    if (new Set(p.headings).size !== p.headings.length)
      problems.push('duplicate headings in the shared list');
  } else if (p.headings?.length) {
    problems.push('headings supplied but no matching_headings question uses them');
  }

  for (const q of p.questions) {
    if (!q.answer.length) problems.push(`q${q.idx} has no answer`);
    if (q.evidence && !p.body.includes(q.evidence.trim()))
      problems.push(`q${q.idx} evidence not found verbatim in body`);
    if (q.kind === 'matching_headings') {
      if (q.options?.length)
        problems.push(`q${q.idx} matching_headings must not carry its own options`);
      const answer = q.answer[0]!;
      if (!p.headings.includes(answer))
        problems.push(`q${q.idx} answer is not in the shared headings list`);
      if (used.has(answer)) problems.push(`q${q.idx} reuses an already-used heading`);
      used.add(answer);
      continue;
    }
    if (q.options && q.options.length && !q.options.includes(q.answer[0]!))
      problems.push(`q${q.idx} answer is not one of its options`);
  }
  return problems;
}

export async function generatePassage(
  opts: GenOptions = {},
): Promise<GenResult<GeneratedPassage>> {
  const data = await call(
    generatedPassageSchema,
    PASSAGE_SYSTEM,
    userLine('Write one IELTS Academic Reading passage with 13 questions.', opts),
  );
  return { data, warnings: validatePassage(data) };
}

// --- listening ------------------------------------------------------------

export function validateListeningTrack(t: GeneratedListeningTrack): string[] {
  const problems: string[] = [];
  const words = t.transcript.split(/\s+/).length;
  if (words < 300) problems.push(`transcript only ${words} words`);
  if (t.questions.length !== 10)
    problems.push(`${t.questions.length} questions, expected 10`);

  const matchingQs = t.questions.filter((q) => q.kind === 'matching');
  const used = new Set<string>();
  if (matchingQs.length) {
    if (!t.matchingOptions || t.matchingOptions.length < matchingQs.length + 3)
      problems.push(
        `${t.matchingOptions?.length ?? 0} matching options for ${matchingQs.length} questions, want at least ${matchingQs.length + 3}`,
      );
    else if (new Set(t.matchingOptions).size !== t.matchingOptions.length)
      problems.push('duplicate matching options in the shared list');
  } else if (t.matchingOptions?.length) {
    problems.push('matchingOptions supplied but no matching question uses them');
  }

  for (const q of t.questions) {
    if (!q.answer.length) problems.push(`q${q.idx} has no answer`);
    if (q.evidence && !t.transcript.includes(q.evidence.trim()))
      problems.push(`q${q.idx} evidence not found verbatim in transcript`);
    if (q.kind === 'matching') {
      if (q.options?.length)
        problems.push(`q${q.idx} matching must not carry its own options`);
      const answer = q.answer[0]!;
      if (!t.matchingOptions?.includes(answer))
        problems.push(`q${q.idx} answer is not in the shared matchingOptions list`);
      if (used.has(answer)) problems.push(`q${q.idx} reuses an already-used option`);
      used.add(answer);
      continue;
    }
    if (q.options && q.options.length && !q.options.includes(q.answer[0]!))
      problems.push(`q${q.idx} answer is not one of its options`);
  }
  return problems;
}

export async function generateListeningTrack(
  opts: GenOptions = {},
): Promise<GenResult<GeneratedListeningTrack>> {
  const data = await call(
    generatedListeningTrackSchema,
    LISTENING_SYSTEM,
    userLine('Write one IELTS Listening transcript with 10 questions.', opts),
  );
  return { data, warnings: validateListeningTrack(data) };
}

// --- speaking ------------------------------------------------------------

/** The generator returns three parts; the file (and DB) shape is one flat list. */
export function flattenSpeakingTest(
  t: z.infer<typeof generatedSpeakingTestSchema>,
): SpeakingTestFile {
  const prompts: SpeakingTestFile['prompts'] = [];
  let idx = 1;
  for (const q of t.part1)
    prompts.push({ idx: idx++, part: 1, text: q.text, cueCardPoints: null, prepSeconds: 0 });
  prompts.push({
    idx: idx++,
    part: 2,
    text: t.part2.cueCard,
    cueCardPoints: t.part2.points,
    prepSeconds: 60,
  });
  for (const q of t.part3)
    prompts.push({ idx: idx++, part: 3, text: q.text, cueCardPoints: null, prepSeconds: 0 });
  return {
    slug: t.slug,
    title: t.title,
    topic: t.topic,
    difficulty: t.difficulty,
    prompts,
  };
}

export function validateSpeakingTest(t: SpeakingTestFile): string[] {
  const problems: string[] = [];
  for (const part of [1, 2, 3])
    if (!t.prompts.some((p) => p.part === part))
      problems.push(`no Part ${part} prompts`);
  const p2 = t.prompts.filter((p) => p.part === 2);
  if (p2.length !== 1) problems.push(`${p2.length} Part 2 prompts, expected 1`);
  if (p2[0] && (!p2[0].cueCardPoints || p2[0].cueCardPoints.length < 3))
    problems.push('Part 2 cue card has fewer than 3 points');
  return problems;
}

export async function generateSpeakingTest(
  opts: GenOptions = {},
): Promise<GenResult<SpeakingTestFile>> {
  const generated = await call(
    generatedSpeakingTestSchema,
    SPEAKING_SYSTEM,
    userLine('Write one full IELTS Speaking test (Parts 1-3).', opts),
  );
  const data = flattenSpeakingTest(generated);
  return { data, warnings: validateSpeakingTest(data) };
}
