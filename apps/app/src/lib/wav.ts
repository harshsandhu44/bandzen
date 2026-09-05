/**
 * Turn microphone PCM into a 16 kHz mono 16-bit PCM WAV.
 *
 * Why WAV: the multimodal grader (`grade-speaking.ts`) accepts `wav` and `mp3`
 * only, and there is no server-side transcoder. 16 kHz mono is what speech
 * models downsample to anyway and keeps it to ~2 MB per minute.
 *
 * Why raw PCM and not `MediaRecorder` + `decodeAudioData`: `MediaRecorder`
 * writes a streaming WebM/MP4 container with no duration in its header, and
 * `decodeAudioData` on those is unreliable across browsers — it can return a
 * truncated or empty buffer without throwing, which is how a recording ends up
 * silent or zero-length. Capturing float samples straight off the mic and
 * encoding them here removes both fragile steps. See `pcm-recorder.ts`.
 *
 * Everything in this file is pure and tested; the browser capture glue lives
 * in `pcm-recorder.ts`.
 */

export const TARGET_RATE = 16_000;

/** Concatenate the per-callback capture buffers into one contiguous track. */
export function mergeChunks(chunks: readonly Float32Array[]): Float32Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Linear-interpolation resample. Speech into a 16 kHz mono file: the source is
 * typically 44.1 or 48 kHz, so this is always downsampling, where linear
 * interpolation is inaudible and a polyphase filter would be over-engineering.
 */
export function resampleLinear(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = pos - lo;
    out[i] = samples[lo]! * (1 - frac) + samples[hi]! * frac;
  }
  return out;
}

/** Float samples in [-1, 1] → a WAV file. One channel, 16-bit PCM. */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(offset + i, s.charCodeAt(i));
  };

  const byteRate = sampleRate * 2;
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(
      44 + i * 2,
      clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
      true,
    );
  }

  return buffer;
}

/** Captured mono PCM chunks at `sampleRate` → a 16 kHz mono WAV blob. */
export function pcmChunksToWav(
  chunks: readonly Float32Array[],
  sampleRate: number,
): Blob {
  const merged = mergeChunks(chunks);
  const resampled = resampleLinear(merged, sampleRate, TARGET_RATE);
  return new Blob([encodeWav(resampled, TARGET_RATE)], { type: 'audio/wav' });
}
