/**
 * Turns each reviewed transcript in content/listening/ into an MP3, uploads
 * it to Cloudflare R2, and writes the resulting public `audioUrl` back into
 * the same JSON file. Run locally, never from a request, after a human has
 * corrected the JSON `generate` wrote.
 *
 *   node --env-file=.env.local scripts/synthesize-listening-audio.mts
 *   node --env-file=.env.local scripts/synthesize-listening-audio.mts --force
 *
 * Skips any track that already has an `audioUrl`, so re-running after editing
 * one track's transcript does not re-spend on every other track. `--force`
 * resynthesizes everything.
 *
 * The TTS call goes through `@bandzen/ai` and the R2 upload through
 * `@bandzen/storage`; both are shared with apps/admin's Listening CMS, which
 * does the same two steps on demand.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computePeaks, synthesizeConversation } from '@bandzen/ai/speech';
import { uploadObject } from '@bandzen/storage/r2';
import type { GeneratedListeningTrack as Track } from '../src/lib/ai/schemas.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'listening');

async function run(force: boolean) {
  const files = readdirSync(SEED_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) {
    console.log(
      `No JSON in ${SEED_DIR} — run generate-listening-content.mts first.`,
    );
    return;
  }

  for (const file of files.sort()) {
    const path = join(SEED_DIR, file);
    const track = JSON.parse(readFileSync(path, 'utf8')) as Track & {
      audioUrl?: string;
      peaks?: number[];
      durationSeconds?: number;
      /** Sidecar for synthesis only — never written to the DB. */
      speakers?: Record<string, 'male' | 'female'>;
    };

    if (track.audioUrl && !force) {
      console.log(`  — ${track.slug} already has audio, skipping`);
      continue;
    }

    console.log(`  … synthesizing ${track.slug}`);
    const audio = await synthesizeConversation(track.transcript, track.speakers);

    track.audioUrl = await uploadObject({
      key: `listening/${track.slug}.mp3`,
      body: audio,
      contentType: 'audio/mpeg',
    });
    const { peaks, durationSeconds } = await computePeaks(audio);
    track.peaks = peaks;
    track.durationSeconds = durationSeconds;
    writeFileSync(path, `${JSON.stringify(track, null, 2)}\n`);
    console.log(`  ✓ ${track.slug} — ${track.audioUrl}`);
  }

  console.log(`\nDone. Now: node scripts/generate-listening-content.mts sql`);
}

await run(process.argv.includes('--force'));
