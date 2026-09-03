import assert from 'node:assert/strict';
import { test } from 'node:test';
import { encodeWav } from './wav.ts';

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
