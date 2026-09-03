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
 * couple of HTTP calls don't justify a new dependency. R2 gets `@aws-sdk/
 * client-s3` instead: R2 speaks the S3 API, and hand-rolling SigV4 signing
 * is worse than the dependency, which only ever runs in this Node script,
 * never in the app bundle.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { GeneratedListeningTrack as Track } from '../src/lib/ai/schemas.ts';

const SEED_DIR = join(import.meta.dirname, '..', 'content', 'listening');
// Rachel, one of ElevenLabs' premade voices — a reasonable single-voice
// default for v1. Override per-run if a track needs a different accent.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM';

function r2Client() {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

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

  const bucket = requireEnv('R2_BUCKET');
  const publicUrl = requireEnv('R2_PUBLIC_URL').replace(/\/$/, '');
  const s3 = r2Client();

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

    const key = `listening/${track.slug}.mp3`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: audio,
        ContentType: 'audio/mpeg',
      }),
    );

    track.audioUrl = `${publicUrl}/${key}`;
    writeFileSync(path, `${JSON.stringify(track, null, 2)}\n`);
    console.log(`  ✓ ${track.slug} — ${track.audioUrl}`);
  }

  console.log(`\nDone. Now: node scripts/generate-listening-content.mts sql`);
}

await run(process.argv.includes('--force'));
