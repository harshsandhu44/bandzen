/**
 * Cloudflare R2, spoken over the S3 API.
 *
 * The one place the R2 client config lives. Two callers:
 * `apps/app/scripts/synthesize-listening-audio.mts` (offline TTS upload) and
 * `apps/admin`'s Listening CMS (an MP3 a human uploads by hand). Both run on
 * Node with the same five `R2_*` env vars; nothing in a browser bundle
 * imports this.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export function r2Client() {
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

/**
 * Puts one object into the bucket and returns its public URL. `key` is the
 * path within the bucket (e.g. `listening/<uuid>.mp3`).
 */
export async function uploadObject(input: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<string> {
  const bucket = requireEnv('R2_BUCKET');
  const publicUrl = requireEnv('R2_PUBLIC_URL').replace(/\/$/, '');

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );

  return `${publicUrl}/${input.key}`;
}
