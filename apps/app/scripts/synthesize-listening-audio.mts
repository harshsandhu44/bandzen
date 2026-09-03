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
 * A plain `fetch` against ElevenLabs' REST API rather than their SDK — a
 * couple of HTTP calls don't justify a new dependency. The R2 upload goes
 * through `@bandzen/storage`, which wraps `@aws-sdk/client-s3` (R2 speaks the
 * S3 API) and is shared with apps/admin's Listening CMS.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { uploadObject } from '@bandzen/storage/r2';
import type { GeneratedListeningTrack as Track } from '../src/lib/ai/schemas.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'listening');
// Rachel, one of ElevenLabs' premade voices — a reasonable single-voice
// default for v1. Override per-run if a track needs a different accent.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value)
    throw new Error(`Missing ${name}. Try: node --env-file=.env.local ...`);
  return value;
}

async function synthesize(transcript: string): Promise<Buffer> {
  const key = requireEnv('ELEVENLABS_API_KEY');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: transcript,
        model_id: 'eleven_multilingual_v2',
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

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
    };

    if (track.audioUrl && !force) {
      console.log(`  — ${track.slug} already has audio, skipping`);
      continue;
    }

    console.log(`  … synthesizing ${track.slug}`);
    const audio = await synthesize(track.transcript);

    track.audioUrl = await uploadObject({
      key: `listening/${track.slug}.mp3`,
      body: audio,
      contentType: 'audio/mpeg',
    });
    writeFileSync(path, `${JSON.stringify(track, null, 2)}\n`);
    console.log(`  ✓ ${track.slug} — ${track.audioUrl}`);
  }

  console.log(`\nDone. Now: node scripts/generate-listening-content.mts sql`);
}

await run(process.argv.includes('--force'));
