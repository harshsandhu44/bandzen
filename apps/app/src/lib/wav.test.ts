import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  encodeWav,
  mergeChunks,
  pcmChunksToWav,
  resampleLinear,
  sliceWav,
} from './wav.ts';

test('encodeWav writes a well-formed 16 kHz mono PCM header', () => {
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
  const view = new DataView(encodeWav(samples, 16_000));
  const str = (o: number, n: number) =>
    String.fromCharCode(...new Uint8Array(view.buffer, o, n));

  assert.equal(str(0, 4), 'RIFF');
  assert.equal(str(8, 4), 'WAVE');
  assert.equal(str(36, 4), 'data');
  assert.equal(view.getUint16(20, true), 1, 'PCM format');
  assert.equal(view.getUint16(22, true), 1, 'one channel');
  assert.equal(view.getUint32(24, true), 16_000, 'sample rate');
  assert.equal(view.getUint16(34, true), 16, 'bits per sample');
  assert.equal(view.getUint32(40, true), samples.length * 2, 'data size');
  assert.equal(view.byteLength, 44 + samples.length * 2);
});

test('encodeWav clamps and maps the full-scale samples', () => {
  const view = new DataView(
    encodeWav(new Float32Array([1, -1, 2, -2]), 16_000),
  );
  assert.equal(view.getInt16(44, true), 0x7fff);
  assert.equal(view.getInt16(46, true), -0x8000);
  assert.equal(view.getInt16(48, true), 0x7fff, 'over-unity clamped');
  assert.equal(view.getInt16(50, true), -0x8000, 'under -1 clamped');
});

test('mergeChunks concatenates capture buffers in order', () => {
  const merged = mergeChunks([
    new Float32Array([1, 2]),
    new Float32Array([3]),
    new Float32Array([4, 5, 6]),
  ]);
  assert.deepEqual([...merged], [1, 2, 3, 4, 5, 6]);
});

test('resampleLinear halves the length going 48k -> 24k and keeps the ends', () => {
  const input = new Float32Array([0, 0.25, 0.5, 0.75, 1, 0.75, 0.5, 0.75]);
  const out = resampleLinear(input, 48_000, 24_000);
  assert.equal(out.length, 4);
  assert.equal(out[0], 0, 'first sample preserved');
});

test('resampleLinear is a no-op at the target rate', () => {
  const input = new Float32Array([0.1, -0.2, 0.3]);
  assert.equal(resampleLinear(input, 16_000, 16_000), input);
});

test('pcmChunksToWav produces a WAV longer than its header from real samples', () => {
  const wav = pcmChunksToWav(
    [new Float32Array(48_000).fill(0.2)], // 1s at 48 kHz
    48_000,
  );
  assert.equal(wav.type, 'audio/wav');
  // 1s at 16 kHz mono 16-bit = 44 + 32000 bytes, well past a header.
  assert.ok(wav.size > 44 + 30_000, `unexpectedly small: ${wav.size}`);
});

test('pcmChunksToWav on no samples is just a header, which the server rejects', () => {
  const wav = pcmChunksToWav([], 48_000);
  assert.equal(wav.size, 44);
});

/** A WAV with a LIST chunk between `fmt ` and `data`, as ElevenLabs emits. */
function wavWithListChunk(frames: number, declaredSize?: number): Uint8Array {
  const bare = new Uint8Array(
    encodeWav(new Float32Array(frames).fill(0.5), 16_000),
  );
  const list = new Uint8Array(8 + 26);
  list.set([...'LIST'].map((c) => c.charCodeAt(0)));
  new DataView(list.buffer).setUint32(4, 26, true);

  const out = new Uint8Array(36 + list.length + (bare.length - 36));
  out.set(bare.subarray(0, 36)); // RIFF header + fmt chunk
  out.set(list, 36);
  out.set(bare.subarray(36), 36 + list.length); // data chunk, id and all
  const view = new DataView(out.buffer);
  view.setUint32(4, declaredSize ?? out.byteLength - 8, true);
  if (declaredSize !== undefined) {
    view.setUint32(36 + list.length + 4, declaredSize, true); // data size too
  }
  return out;
}

test('sliceWav cuts to whole frames and rewrites both size fields', () => {
  const wav = new Uint8Array(encodeWav(new Float32Array(16_000 * 10), 16_000));
  const cut = sliceWav(wav, 3);
  const view = new DataView(cut.buffer);

  const dataBytes = 3 * 16_000 * 2;
  assert.equal(cut.byteLength, 44 + dataBytes);
  assert.equal(view.getUint32(40, true), dataBytes, 'data size rewritten');
  assert.equal(
    view.getUint32(4, true),
    cut.byteLength - 8,
    'RIFF size rewritten',
  );
  assert.equal(dataBytes % 2, 0, 'whole 16-bit frames');
});

test('sliceWav walks past a LIST chunk instead of assuming a 44-byte header', () => {
  // A fixed offset would treat the 34-byte LIST chunk as samples and land the
  // cut 34 bytes early, with the metadata audible as a click at the start.
  const wav = wavWithListChunk(16_000 * 5);
  const cut = sliceWav(wav, 2);
  const dataAt = 44 + 34;

  assert.equal(cut.byteLength, dataAt + 2 * 16_000 * 2);
  assert.equal(
    String.fromCharCode(...cut.subarray(dataAt - 8, dataAt - 4)),
    'data',
  );
  assert.equal(
    new DataView(cut.buffer).getUint32(dataAt - 4, true),
    2 * 16_000 * 2,
  );
});

test('sliceWav trusts the bytes present over a streamed size field', () => {
  // A streaming encoder writes 0xFFFFFFFF for a length it does not know yet.
  const wav = wavWithListChunk(16_000 * 5, 0xffffffff);
  const cut = sliceWav(wav, 1);
  assert.equal(cut.byteLength, 44 + 34 + 16_000 * 2);
});

test('sliceWav returns the input when it is already shorter', () => {
  const wav = new Uint8Array(encodeWav(new Float32Array(16_000), 16_000));
  assert.equal(sliceWav(wav, 5), wav);
});

test('sliceWav rejects bytes that are not a RIFF/WAVE file', () => {
  assert.throws(() => sliceWav(new Uint8Array(64), 1), /RIFF/);
});

test('sliceWav cuts from an offset, so consecutive slices differ', () => {
  const samples = new Float32Array(16_000 * 3);
  samples.fill(1, 16_000, 32_000); // second 1 is full-scale, the rest silent
  const wav = new Uint8Array(encodeWav(samples, 16_000));

  const quiet = sliceWav(wav, 1, 0);
  const loud = sliceWav(wav, 1, 1);
  assert.equal(quiet.byteLength, loud.byteLength);
  assert.equal(new DataView(quiet.buffer).getInt16(44, true), 0);
  assert.equal(new DataView(loud.buffer).getInt16(44, true), 0x7fff);
});

test('sliceWav refuses a slice that starts past the end', () => {
  const wav = new Uint8Array(encodeWav(new Float32Array(16_000), 16_000));
  assert.throws(() => sliceWav(wav, 1, 5), /past the end/);
});
