import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  encodeWav,
  mergeChunks,
  pcmChunksToWav,
  resampleLinear,
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
