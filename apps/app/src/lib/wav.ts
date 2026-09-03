/**
 * Turn a `MediaRecorder` blob into a 16 kHz mono 16-bit PCM WAV.
 *
 * Why: the multimodal grader (`grade-speaking.ts`) accepts `wav` and `mp3`
 * only, and `MediaRecorder` produces webm/opus in Chrome and mp4 in Safari.
 * Encoding to WAV in the browser gives one stored format that both Whisper and
 * the grader take, with no server-side transcoder. 16 kHz mono is what speech
 * models downsample to anyway, and keeps it to ~2 MB per minute.
 *
 * `encodeWav` is pure and tested; `blobToWav` is the browser glue around it
 * (`AudioContext` to decode whatever was recorded, `OfflineAudioContext` to
 * resample) and is not.
 */

const TARGET_RATE = 16_000;

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

/** Recorded blob (any codec the browser gave us) → 16 kHz mono WAV blob. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const decodeCtx = new AudioCtx();
  try {
    const decoded = await decodeCtx.decodeAudioData(await blob.arrayBuffer());

    const frames = Math.ceil(decoded.duration * TARGET_RATE);
    const offline = new OfflineAudioContext(1, frames, TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();

    return new Blob([encodeWav(rendered.getChannelData(0), TARGET_RATE)], {
      type: 'audio/wav',
    });
  } finally {
    void decodeCtx.close();
  }
}
