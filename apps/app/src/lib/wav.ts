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

/**
 * Cut `seconds` of a PCM WAV, starting at `fromSeconds`, header rewritten to
 * match.
 *
 * The inverse of `encodeWav`, and the reason it lives here: this file owns WAV
 * framing. Used by `scripts/eval-speaking-audio.mts` to cut one synthesized
 * answer into fixtures of known duration.
 *
 * It walks the chunk list rather than assuming `encodeWav`'s 44-byte header —
 * ElevenLabs emits a `LIST` chunk between `fmt ` and `data`, so a fixed offset
 * would slice metadata as if it were samples. Declared sizes are treated as
 * hints and clamped to the bytes actually present: a streaming encoder may
 * write 0 or 0xFFFFFFFF for a length it did not know yet.
 *
 * `fromSeconds` is how the sweep builds several distinct clips out of one
 * synthesized answer, rather than sending the same audio three times.
 *
 * Returns the input unchanged when the cut would be the whole file.
 */
export function sliceWav(
  wav: Uint8Array,
  seconds: number,
  fromSeconds = 0,
): Uint8Array {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const ascii = (at: number) =>
    String.fromCharCode(...wav.subarray(at, at + 4));

  if (wav.byteLength < 12 || ascii(0) !== 'RIFF' || ascii(8) !== 'WAVE') {
    throw new Error('Not a RIFF/WAVE file.');
  }

  let blockAlign = 0;
  let byteRate = 0;
  let dataAt = -1;
  let dataLength = 0;

  // Chunks are id(4) + size(4) + payload, each padded to an even length.
  for (let at = 12; at + 8 <= wav.byteLength;) {
    const id = ascii(at);
    const declared = view.getUint32(at + 4, true);
    const body = at + 8;
    const available = wav.byteLength - body;
    const size = Math.min(declared, available);
    if (id === 'fmt ' && size >= 16) {
      byteRate = view.getUint32(body + 8, true);
      blockAlign = view.getUint16(body + 12, true);
    } else if (id === 'data') {
      dataAt = body;
      dataLength = size;
      break;
    }
    at = body + size + (size % 2);
  }

  if (dataAt < 0) throw new Error('WAV has no data chunk.');
  if (!byteRate || !blockAlign) throw new Error('WAV has no usable fmt chunk.');

  // Whole frames only — half a sample is noise on the end of the clip.
  const bytesFor = (t: number) =>
    Math.floor(Math.round(t * byteRate) / blockAlign) * blockAlign;
  const start = Math.min(Math.max(0, bytesFor(fromSeconds)), dataLength);
  const want = Math.min(bytesFor(seconds), dataLength - start);
  if (want <= 0)
    throw new Error('That slice starts past the end of the audio.');
  if (start === 0 && want >= dataLength) return wav;

  const out = new Uint8Array(dataAt + want);
  out.set(wav.subarray(0, dataAt));
  out.set(wav.subarray(dataAt + start, dataAt + start + want), dataAt);
  const outView = new DataView(out.buffer);
  outView.setUint32(4, out.byteLength - 8, true);
  outView.setUint32(dataAt - 4, want, true);
  return out;
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
