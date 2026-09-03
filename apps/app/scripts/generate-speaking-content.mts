/**
 * Offline speaking-content generation. Run locally, never from a request.
 *
 *   node --env-file=.env.local scripts/generate-speaking-content.mts generate --count 5
 *   node --env-file=.env.local scripts/generate-speaking-content.mts sql
 *
 * `generate` writes one reviewable JSON file per test into content/speaking/,
 * with the three parts flattened to an ordered `prompts` array and no examiner
 * audio yet. A human reviews it, then `scripts/synthesize-speaking-audio.mts`
 * fills in each prompt's `audioUrl`, then `sql` builds
 * content/speaking-seed.sql (applied with `node scripts/seed.mts
 * content/speaking-seed.sql`). Same split as the listening pipeline.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import {
  generatedSpeakingTestSchema,
  type GeneratedSpeakingTest,
} from '../src/lib/ai/schemas.ts';
import { parseStructured, strictJsonSchema } from '../src/lib/ai/structured.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'speaking');
const SQL_OUT = join(import.meta.dirname, '..', 'content', 'speaking-seed.sql');
const MODEL = process.env.OPENAI_CONTENT_MODEL ?? 'gpt-5.5';

const TEST_SCHEMA = strictJsonSchema(generatedSpeakingTestSchema);

type PromptFile = {
  idx: number;
  part: number;
  text: string;
  cueCardPoints: string[] | null;
  prepSeconds: number;
  audioUrl?: string;
};
type TestFile = {
  slug: string;
  title: string;
  topic: string;
  difficulty: number;
  prompts: PromptFile[];
};

const SYSTEM = `You write IELTS Speaking practice tests — the examiner's side of a real interview.

Rules that matter:
- Original material only. Never reproduce copyrighted exam questions.
- Part 1: 3-4 short questions on ONE familiar topic (home, work, study, a
  hobby, daily routine). Plain, personal, answerable in a sentence or two.
- Part 2: one cue card in the real format — a "Describe ..." line, then 3-4
  "You should say:" points. The candidate speaks alone for 1-2 minutes.
- Part 3: 4-6 questions that open out the Part 2 topic into abstract
  discussion — opinion, comparison, cause, prediction. No yes/no questions.
- Every question is something an examiner would actually say aloud. No
  stage directions, no "the examiner asks", just the words.
- Keep each question to one or two sentences.`;

function flatten(t: GeneratedSpeakingTest): TestFile {
  const prompts: PromptFile[] = [];
  let idx = 1;
  for (const q of t.part1) {
    prompts.push({
      idx: idx++,
      part: 1,
      text: q.text,
      cueCardPoints: null,
      prepSeconds: 0,
    });
  }
  prompts.push({
    idx: idx++,
    part: 2,
    text: t.part2.cueCard,
    cueCardPoints: t.part2.points,
    prepSeconds: 60,
  });
  for (const q of t.part3) {
    prompts.push({
      idx: idx++,
      part: 3,
      text: q.text,
      cueCardPoints: null,
      prepSeconds: 0,
    });
  }
  return {
    slug: t.slug,
    title: t.title,
    topic: t.topic,
    difficulty: t.difficulty,
    prompts,
  };
}

function validate(t: TestFile): string[] {
  const problems: string[] = [];
  for (const part of [1, 2, 3]) {
    if (!t.prompts.some((p) => p.part === part)) {
      problems.push(`no Part ${part} prompts`);
    }
  }
  const p2 = t.prompts.filter((p) => p.part === 2);
  if (p2.length !== 1) problems.push(`${p2.length} Part 2 prompts, expected 1`);
  if (p2[0] && (!p2[0].cueCardPoints || p2[0].cueCardPoints.length < 3)) {
    problems.push('Part 2 cue card has fewer than 3 points');
  }
  return problems;
}

async function generate(count: number) {
  const client = new OpenAI({ apiKey: requireKey() });
  mkdirSync(SEED_DIR, { recursive: true });

  const existing = new Set(
    readdirSync(SEED_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, '')),
  );

  for (let i = 0; i < count; i += 1) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Write one IELTS Speaking test. Choose a Part 2 topic unlike any of these already generated: ${[...existing].join(', ') || 'none yet'}.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'test', strict: true, schema: TEST_SCHEMA },
      },
    });

    const test = flatten(
      parseStructured(response, generatedSpeakingTestSchema),
    );
    const problems = validate(test);
    if (problems.length)
      console.warn(`  ⚠ ${test.slug}: ${problems.join('; ')}`);

    writeFileSync(
      join(SEED_DIR, `${test.slug}.json`),
      `${JSON.stringify(test, null, 2)}\n`,
    );
    existing.add(test.slug);
    console.log(`  ✓ ${test.slug} — ${test.title}`);
  }

  console.log(
    `\nReview the JSON in content/speaking/, then: node scripts/synthesize-speaking-audio.mts`,
  );
}

const quote = (v: string) => `'${v.replaceAll("'", "''")}'`;
const jsonb = (v: unknown) => `${quote(JSON.stringify(v))}::jsonb`;

function toSql() {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length)
    throw new Error(`No JSON in ${SEED_DIR} — run \`generate\` first.`);

  const out: string[] = [
    '-- Generated by scripts/generate-speaking-content.mts. Edit the JSON in',
    '-- content/speaking/, then regenerate; do not hand-edit this file.',
    '',
    'begin;',
    '',
  ];

  let missingAudio = 0;

  for (const file of files.sort()) {
    const t = JSON.parse(
      readFileSync(join(SEED_DIR, file), 'utf8'),
    ) as TestFile;

    if (t.prompts.some((p) => !p.audioUrl)) {
      missingAudio += 1;
      console.warn(
        `  ⚠ ${t.slug} has prompts without audioUrl — run scripts/synthesize-speaking-audio.mts first`,
      );
      continue;
    }

    out.push(
      `-- ${t.title}`,
      `insert into public.speaking_tests (slug, title, topic, difficulty)`,
      `values (${quote(t.slug)}, ${quote(t.title)}, ${quote(t.topic)}, ${t.difficulty})`,
      `on conflict (slug) do update set`,
      `  title = excluded.title, topic = excluded.topic, difficulty = excluded.difficulty;`,
      '',
    );

    for (const p of t.prompts) {
      out.push(
        `insert into public.speaking_prompts (test_id, idx, part, text, cue_card_points, prep_seconds, audio_url)`,
        `select st.id, ${p.idx}, ${p.part}, ${quote(p.text)},`,
        `       ${p.cueCardPoints?.length ? jsonb(p.cueCardPoints) : 'null'}, ${p.prepSeconds}, ${quote(p.audioUrl!)}`,
        `from public.speaking_tests st where st.slug = ${quote(t.slug)}`,
        `on conflict (test_id, idx) do update set`,
        `  part = excluded.part, text = excluded.text, cue_card_points = excluded.cue_card_points,`,
        `  prep_seconds = excluded.prep_seconds, audio_url = excluded.audio_url;`,
        '',
      );
    }
  }

  out.push('commit;', '');
  writeFileSync(SQL_OUT, out.join('\n'));
  console.log(`Wrote ${SQL_OUT} from ${files.length - missingAudio} test(s).`);
  if (missingAudio) {
    console.log(`${missingAudio} test(s) skipped for missing audio.`);
  }
}

function requireKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key)
    throw new Error(
      'Missing OPENAI_API_KEY. Try: node --env-file=.env.local ...',
    );
  return key;
}

const [command, ...rest] = process.argv.slice(2);

if (command === 'generate') {
  const flag = rest.indexOf('--count');
  const count = flag === -1 ? 1 : Number(rest[flag + 1]);
  if (!Number.isInteger(count) || count < 1)
    throw new Error('--count must be a positive integer');
  await generate(count);
} else if (command === 'sql') {
  toSql();
} else {
  console.log(`usage:
  generate --count <n>   write <n> reviewable test JSON files
  sql                    build content/speaking-seed.sql from those files`);
  process.exit(1);
}
