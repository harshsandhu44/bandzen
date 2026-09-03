/**
 * Offline listening-content generation. Run locally, never from a request.
 *
 *   node --env-file=.env.local scripts/generate-listening-content.mts generate --count 5
 *   node --env-file=.env.local scripts/generate-listening-content.mts sql
 *
 * `generate` writes one reviewable JSON file per track into content/listening/,
 * with no audio yet. `sql` turns whatever JSON is in that directory into
 * content/listening-seed.sql — a separate file from content/seed.sql, applied
 * with `node scripts/seed.mts content/listening-seed.sql`, so this script and
 * generate-content.mts can never race each other overwriting the same file.
 *
 * The split from `generate` to `sql` is deliberate, same as passages: a human
 * reads and corrects the transcript and questions between the two steps, and
 * `scripts/synthesize-listening-audio.mts` turns the reviewed transcript into
 * an audioUrl in between — before anything is spent on TTS.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import {
  generatedListeningTrackSchema,
  type GeneratedListeningTrack as Track,
} from '../src/lib/ai/schemas.ts';
import { parseStructured, strictJsonSchema } from '../src/lib/ai/structured.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'listening');
const SQL_OUT = join(
  import.meta.dirname,
  '..',
  'content',
  'listening-seed.sql',
);
const MODEL = process.env.OPENAI_CONTENT_MODEL ?? 'gpt-5.5';

const TRACK_SCHEMA = strictJsonSchema(generatedListeningTrackSchema);

const SYSTEM = `You write IELTS Listening practice material — a spoken transcript, not prose to be read.

Rules that matter:
- The transcript must be original spoken material on an everyday or academic
  topic. Never reproduce copyrighted exam material. Label each speaker turn in
  a conversation (e.g. "Sarah:", "Tom:") on its own line; a monologue needs no
  labels.
- 10 questions, idx 1..10, mixing at least two of the allowed question kinds
  (multiple_choice, sentence_completion, matching).
- multiple_choice must supply four options, and the answer must match one
  exactly.
- matching must have options: null. Every such question draws from the single
  track-level "matchingOptions" list. Provide at least three more options than
  there are matching questions, no option is the answer to more than one
  question, and every unused option must still be a credible fit for something
  in the transcript.
- sentence_completion answers must be words lifted verbatim from the
  transcript, respecting a stated word limit in the prompt (real Listening
  favours short answers — a number, a name, one or two words).
- Every question's evidence must be a line that appears verbatim in transcript.
- Distractors must be plausible enough that the question cannot be answered
  without hearing the whole transcript.`;

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
          content: `Write one IELTS Listening track with 10 questions. Choose a topic unlike any of these already generated: ${[...existing].join(', ') || 'none yet'}.`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'track', strict: true, schema: TRACK_SCHEMA },
      },
    });

    const track = parseStructured(response, generatedListeningTrackSchema);
    const problems = validate(track);
    if (problems.length) {
      console.warn(`  ⚠ ${track.slug}: ${problems.join('; ')}`);
    }

    writeFileSync(
      join(SEED_DIR, `${track.slug}.json`),
      `${JSON.stringify(track, null, 2)}\n`,
    );
    existing.add(track.slug);
    console.log(`  ✓ ${track.slug} — ${track.title}`);
  }

  console.log(
    `\nReview the JSON in content/listening/, then: node scripts/synthesize-listening-audio.mts`,
  );
}

/**
 * Cheap structural checks. Strict Structured Outputs guarantees the shape but
 * not the sense — "evidence appears verbatim in the transcript" is the one
 * that actually catches a bad generation.
 */
function validate(t: Track): string[] {
  const problems: string[] = [];
  const words = t.transcript.split(/\s+/).length;
  if (words < 300) problems.push(`transcript only ${words} words`);
  if (t.questions.length !== 10)
    problems.push(`${t.questions.length} questions, expected 10`);

  const matchingQs = t.questions.filter((q) => q.kind === 'matching');
  const used = new Set<string>();

  if (matchingQs.length) {
    if (
      !t.matchingOptions ||
      t.matchingOptions.length < matchingQs.length + 3
    ) {
      problems.push(
        `${t.matchingOptions?.length ?? 0} matching options for ${matchingQs.length} questions, want at least ${matchingQs.length + 3}`,
      );
    } else if (new Set(t.matchingOptions).size !== t.matchingOptions.length) {
      problems.push('duplicate matching options in the shared list');
    }
  } else if (t.matchingOptions?.length) {
    problems.push(
      'matchingOptions supplied but no matching question uses them',
    );
  }

  for (const q of t.questions) {
    if (!q.answer.length) problems.push(`q${q.idx} has no answer`);
    if (q.evidence && !t.transcript.includes(q.evidence.trim())) {
      problems.push(`q${q.idx} evidence not found verbatim in transcript`);
    }

    if (q.kind === 'matching') {
      if (q.options?.length) {
        problems.push(`q${q.idx} matching must not carry its own options`);
      }
      const answer = q.answer[0]!;
      if (!t.matchingOptions?.includes(answer)) {
        problems.push(
          `q${q.idx} answer is not in the shared matchingOptions list`,
        );
      }
      if (used.has(answer))
        problems.push(`q${q.idx} reuses an already-used option`);
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
    '-- Generated by scripts/generate-listening-content.ts. Edit the JSON in',
    '-- content/listening/, then regenerate; do not hand-edit this file.',
    '',
    'begin;',
    '',
  ];

  let missingAudio = 0;

  for (const file of files.sort()) {
    const t = JSON.parse(
      readFileSync(join(SEED_DIR, file), 'utf8'),
    ) as Track & {
      audioUrl?: string;
    };
    if (!t.audioUrl) {
      missingAudio += 1;
      console.warn(
        `  ⚠ ${t.slug} has no audioUrl yet — run scripts/synthesize-listening-audio.mts first`,
      );
      continue;
    }

    out.push(
      `-- ${t.title}`,
      `insert into public.listening_tracks (slug, title, topic, transcript, audio_url, matching_options, difficulty)`,
      `values (${quote(t.slug)}, ${quote(t.title)}, ${quote(t.topic)}, ${quote(t.transcript)}, ${quote(t.audioUrl)}, ${t.matchingOptions?.length ? jsonb(t.matchingOptions) : 'null'}, ${t.difficulty})`,
      `on conflict (slug) do update set`,
      `  title = excluded.title, topic = excluded.topic, transcript = excluded.transcript,`,
      `  audio_url = excluded.audio_url, matching_options = excluded.matching_options,`,
      `  difficulty = excluded.difficulty;`,
      '',
    );

    for (const q of t.questions) {
      out.push(
        `with tr as (select id from public.listening_tracks where slug = ${quote(t.slug)}),`,
        `     q as (`,
        `       insert into public.questions (track_id, idx, kind, prompt, options, evidence, explanation)`,
        `       select tr.id, ${q.idx}, ${quote(q.kind)}::public.question_kind, ${quote(q.prompt)},`,
        `              ${q.options ? jsonb(q.options) : 'null'}, ${quote(q.evidence)}, ${quote(q.explanation)}`,
        `       from tr`,
        `       on conflict (track_id, idx) do update set`,
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

  out.push('commit;', '');
  writeFileSync(SQL_OUT, out.join('\n'));
  const seeded = files.length - missingAudio;
  console.log(`Wrote ${SQL_OUT} from ${seeded} track(s).`);
  if (missingAudio) {
    console.log(
      `${missingAudio} track(s) skipped for missing audio — see warnings above.`,
    );
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
  generate --count <n>   write <n> reviewable track JSON files
  sql                    build content/listening-seed.sql from those files`);
  process.exit(1);
}
