/**
 * Turns each reviewed prompt in content/speaking/ into an examiner-voice MP3,
 * uploads it to Cloudflare R2, and writes the resulting `audioUrl` back into
 * the same JSON file. Run locally, after a human has corrected the JSON
 * `generate-speaking-content.mts` wrote.
 *
 *   node --env-file=.env.local scripts/synthesize-speaking-audio.mts
 *   node --env-file=.env.local scripts/synthesize-speaking-audio.mts --force
 *
 * Skips any prompt that already has an `audioUrl`, so re-running after editing
 * one prompt does not re-spend on the rest. `--force` resynthesizes all.
 *
 * Same two shared modules the Listening pipeline and the CMS use:
 * `@bandzen/ai` for TTS, `@bandzen/storage` for the R2 upload.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { synthesizeSpeech } from '@bandzen/ai/speech';
import { uploadObject } from '@bandzen/storage/r2';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'speaking');

type PromptFile = { idx: number; text: string; audioUrl?: string };
type TestFile = { slug: string; prompts: PromptFile[] };

async function run(force: boolean) {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) {
    console.log(
      `No JSON in ${SEED_DIR} — run generate-speaking-content.mts first.`,
    );
    return;
  }

  for (const file of files.sort()) {
    const path = join(SEED_DIR, file);
    const test = JSON.parse(readFileSync(path, 'utf8')) as TestFile;
    let changed = false;

    for (const prompt of test.prompts) {
      if (prompt.audioUrl && !force) continue;

      console.log(`  … synthesizing ${test.slug} #${prompt.idx}`);
      const audio = await synthesizeSpeech(prompt.text);
      prompt.audioUrl = await uploadObject({
        key: `speaking/${test.slug}-${prompt.idx}.mp3`,
        body: audio,
        contentType: 'audio/mpeg',
      });
      changed = true;
    }

    if (changed) {
      writeFileSync(path, `${JSON.stringify(test, null, 2)}\n`);
      console.log(`  ✓ ${test.slug}`);
    } else {
      console.log(`  — ${test.slug} already has all audio, skipping`);
    }
  }

  console.log(`\nDone. Now: node scripts/generate-speaking-content.mts sql`);
}

await run(process.argv.includes('--force'));
