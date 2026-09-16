/**
 * Turns each reviewed transcript in content/pte/ into an MP3, uploads it to
 * Cloudflare R2, and writes the resulting public `audioUrl` back into the same
 * JSON file. Run locally, never from a request, after a human has read the
 * JSON the items were written into.
 *
 *   node --env-file=.env.local scripts/synthesize-pte-audio.mts
 *   node --env-file=.env.local scripts/synthesize-pte-audio.mts --force
 *
 * The listening equivalent of this script works one track per file; PTE task
 * files hold an array of items, because a task type's bank is many small items
 * rather than one long recording. Otherwise identical, deliberately: the TTS
 * call goes through `@bandzen/ai` and the upload through `@bandzen/storage`,
 * the same two steps the Listening CMS does on demand.
 *
 * Skips any item that already has audio, so re-running after fixing one
 * transcript does not re-spend on every other item. `--force` redoes them all.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { synthesizeConversation } from '@bandzen/ai/speech';
import { uploadObject } from '@bandzen/storage/r2';

type Item = {
  slug: string;
  transcript?: string;
  stimulus: { audioUrl?: string; [key: string]: unknown };
  /** Sidecar for synthesis only — never imported. */
  speakers?: Record<string, 'male' | 'female'>;
};

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'pte');

async function run(force: boolean) {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) {
    console.log(`No JSON in ${SEED_DIR}.`);
    return;
  }

  for (const file of files.sort()) {
    const path = join(SEED_DIR, file);
    const items = JSON.parse(readFileSync(path, 'utf8')) as Item[];
    let changed = false;

    for (const item of items) {
      // Only an item whose stimulus IS audio has a transcript to speak. A
      // reading passage's text is not something to read out.
      if (!item.transcript) continue;
      if (item.stimulus.audioUrl && !force) {
        console.log(`  — ${item.slug} already has audio, skipping`);
        continue;
      }

      console.log(`  … synthesizing ${item.slug}`);
      // Falls back to a single voice when the transcript names no speakers,
      // which is every task but the group discussion.
      const audio = await synthesizeConversation(
        item.transcript,
        item.speakers,
      );
      item.stimulus.audioUrl = await uploadObject({
        key: `exam-tasks/${item.slug}.mp3`,
        body: audio,
        contentType: 'audio/mpeg',
      });
      changed = true;
      console.log(`  ✓ ${item.slug} — ${item.stimulus.audioUrl}`);
    }

    if (changed) writeFileSync(path, `${JSON.stringify(items, null, 2)}\n`);
  }

  console.log('\nDone. Import the file through the CMS at /tasks/import.');
}

await run(process.argv.includes('--force'));
