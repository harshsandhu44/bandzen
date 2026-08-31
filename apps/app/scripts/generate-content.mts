/**
 * Offline content generation. Run locally, never from a request.
 *
 *   node --env-file=.env.local scripts/generate-content.ts generate --count 5
 *   node --env-file=.env.local scripts/generate-content.ts sql
 *
 * `generate` writes one reviewable JSON file per passage into content/passages/.
 * `sql` turns whatever JSON is in that directory into content/seed.sql.
 *
 * The split is deliberate: passages get read and corrected by a human between
 * the two steps, and edits go into the JSON, not into generated SQL.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import {
  generatedPassageSchema,
  type GeneratedPassage as Passage,
} from '../src/lib/ai/schemas.ts';
import { parseStructured, strictJsonSchema } from '../src/lib/ai/structured.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'passages');
const PROMPTS_FILE = join(import.meta.dirname, '..', 'content', 'prompts.json');
const SQL_OUT = join(import.meta.dirname, '..', 'content', 'seed.sql');
const MODEL = process.env.OPENAI_CONTENT_MODEL ?? 'gpt-5.5';

type Prompt = {
  slug: string;
  task: 1 | 2;
  promptText: string;
};

const PASSAGE_SCHEMA = strictJsonSchema(generatedPassageSchema);

const SYSTEM = `You write IELTS Academic Reading practice material.

Rules that matter:
- The passage must be original prose on a factual, academic topic. Never reproduce
  copyrighted exam material.
- 13 questions, idx 1..13, mixing at least three of the allowed question kinds.
- true_false_not_given answers must be exactly "TRUE", "FALSE" or "NOT GIVEN".
  yes_no_not_given must be "YES", "NO" or "NOT GIVEN". Include at least one
  NOT GIVEN, and make it genuinely not given rather than merely contradicted.
- multiple_choice must supply four options, and the answer must match one exactly.
- matching_headings must have options: null. Every such question draws from the
  single passage-level "headings" list, exactly as a real IELTS paper presents
  one list of headings for all the paragraphs it covers. Provide at least three
  more headings than there are matching_headings questions, no heading is the
  answer to more than one question, and every unused heading must still be a
  credible summary of something in the passage.
- sentence_completion answers must be words lifted verbatim from the passage,
  respecting a stated word limit in the prompt.
- Every question's evidence must be a sentence that appears verbatim in body.
- Distractors must be plausible enough that the question cannot be answered
  without reading the passage. A heading naming a topic the passage never
  mentions at all is a wasted option: build distractors from real content in
  the passage that belongs to a DIFFERENT paragraph, or from a plausible
  misreading of the right one. The same applies to multiple_choice.`;

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
          content: `Write one IELTS Academic Reading passage with 13 questions. Choose a topic unlike any of these already generated: ${[...existing].join(', ') || 'none yet'}.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'passage', strict: true, schema: PASSAGE_SCHEMA },
      },
    });

    const passage = parseStructured(response, generatedPassageSchema);
    const problems = validate(passage);
    if (problems.length) {
      console.warn(`  ⚠ ${passage.slug}: ${problems.join('; ')}`);
    }

    writeFileSync(
      join(SEED_DIR, `${passage.slug}.json`),
      `${JSON.stringify(passage, null, 2)}\n`,
    );
    existing.add(passage.slug);
    console.log(`  ✓ ${passage.slug} — ${passage.title}`);
  }

  console.log(
    `\nReview the JSON in content/passages/, then: node scripts/generate-content.mts sql`,
  );
}

/**
 * Cheap structural checks. Strict Structured Outputs guarantees the shape but
 * not the sense — "evidence appears verbatim in the body" is the one that
 * actually catches a bad generation.
 */
function validate(p: Passage): string[] {
  const problems: string[] = [];
  const words = p.body.split(/\s+/).length;
  if (words < 600) problems.push(`body only ${words} words`);
  if (p.questions.length !== 13)
    problems.push(`${p.questions.length} questions, expected 13`);

  const headingQs = p.questions.filter((q) => q.kind === 'matching_headings');
  const used = new Set<string>();

  if (headingQs.length) {
    // Real IELTS always offers more headings than paragraphs; with no spares
    // the last question is answerable by elimination alone.
    if (p.headings.length < headingQs.length + 3) {
      problems.push(
        `${p.headings.length} headings for ${headingQs.length} questions, want at least ${headingQs.length + 3}`,
      );
    }
    if (new Set(p.headings).size !== p.headings.length) {
      problems.push('duplicate headings in the shared list');
    }
  } else if (p.headings?.length) {
    problems.push(
      'headings supplied but no matching_headings question uses them',
    );
  }

  for (const q of p.questions) {
    if (!q.answer.length) problems.push(`q${q.idx} has no answer`);
    if (q.evidence && !p.body.includes(q.evidence.trim())) {
      problems.push(`q${q.idx} evidence not found verbatim in body`);
    }

    if (q.kind === 'matching_headings') {
      if (q.options?.length) {
        problems.push(
          `q${q.idx} matching_headings must not carry its own options`,
        );
      }
      const answer = q.answer[0]!;
      if (!p.headings.includes(answer)) {
        problems.push(`q${q.idx} answer is not in the shared headings list`);
      }
      if (used.has(answer))
        problems.push(`q${q.idx} reuses an already-used heading`);
      used.add(answer);
      continue;
    }

    if (q.options && q.options.length && !q.options.includes(q.answer[0]!)) {
      problems.push(`q${q.idx} answer is not one of its options`);
    }
  }
  return problems;
}

const quote = (v: string) => `'${v.replaceAll("'", "''")}'`;
const jsonb = (v: unknown) => `${quote(JSON.stringify(v))}::jsonb`;

function toSql() {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length)
    throw new Error(`No JSON in ${SEED_DIR} — run \`generate\` first.`);

  const out: string[] = [
    '-- Generated by scripts/generate-content.ts. Edit the JSON in content/passages/,',
    '-- then regenerate; do not hand-edit this file.',
    '',
    'begin;',
    '',
  ];

  for (const file of files.sort()) {
    const p = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8')) as Passage;

    out.push(
      `-- ${p.title}`,
      `insert into public.passages (slug, title, body, topic, headings, difficulty)`,
      `values (${quote(p.slug)}, ${quote(p.title)}, ${quote(p.body)}, ${quote(p.topic)}, ${p.headings?.length ? jsonb(p.headings) : 'null'}, ${p.difficulty})`,
      `on conflict (slug) do update set`,
      `  title = excluded.title, body = excluded.body, topic = excluded.topic,`,
      `  headings = excluded.headings, difficulty = excluded.difficulty;`,
      '',
    );

    for (const q of p.questions) {
      out.push(
        `with p as (select id from public.passages where slug = ${quote(p.slug)}),`,
        `     q as (`,
        `       insert into public.questions (passage_id, idx, kind, prompt, options, evidence, explanation)`,
        `       select p.id, ${q.idx}, ${quote(q.kind)}::public.question_kind, ${quote(q.prompt)},`,
        `              ${q.options ? jsonb(q.options) : 'null'}, ${quote(q.evidence)}, ${quote(q.explanation)}`,
        `       from p`,
        `       on conflict (passage_id, idx) do update set`,
        `         kind = excluded.kind, prompt = excluded.prompt, options = excluded.options,`,
        `         evidence = excluded.evidence, explanation = excluded.explanation`,
        `       returning id`,
        `     )`,
        `insert into public.question_answers (question_id, answer)`,
        `select q.id, ${jsonb(q.answer)} from q`,
        `on conflict (question_id) do update set answer = excluded.answer;`,
        '',
      );
    }
  }

  // Writing prompts are hand-authored in content/prompts.json rather than
  // generated: there are only a few dozen, they barely change, and the task
  // rubric matters more than volume.
  let promptCount = 0;
  if (existsSync(PROMPTS_FILE)) {
    const prompts = JSON.parse(readFileSync(PROMPTS_FILE, 'utf8')) as Prompt[];
    promptCount = prompts.length;
    for (const prompt of prompts) {
      out.push(
        `insert into public.writing_prompts (slug, task, prompt_text)`,
        `values (${quote(prompt.slug)}, ${prompt.task}, ${quote(prompt.promptText)})`,
        `on conflict (slug) do update set`,
        `  task = excluded.task, prompt_text = excluded.prompt_text;`,
        '',
      );
    }
  }

  out.push('commit;', '');
  writeFileSync(SQL_OUT, out.join('\n'));
  console.log(
    `Wrote ${SQL_OUT} from ${files.length} passage(s) and ${promptCount} prompt(s).`,
  );
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
  generate --count <n>   write <n> reviewable passage JSON files
  sql                    build content/seed.sql from those files`);
  process.exit(1);
}
