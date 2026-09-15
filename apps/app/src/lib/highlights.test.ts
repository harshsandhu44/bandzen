import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addSpan, removeSpanAt, segments } from './highlights.ts';

test('addSpan merges overlapping and touching spans, keeps others sorted', () => {
  assert.deepEqual(addSpan([[10, 20]], [0, 5]), [
    [0, 5],
    [10, 20],
  ]);
  assert.deepEqual(
    addSpan(
      [
        [0, 5],
        [10, 20],
      ],
      [4, 11],
    ),
    [[0, 20]],
  );
  assert.deepEqual(addSpan([[0, 5]], [5, 8]), [[0, 8]]);
  assert.deepEqual(addSpan([[0, 5]], [3, 3]), [[0, 5]]);
});

test('removeSpanAt drops only the span starting there', () => {
  assert.deepEqual(
    removeSpanAt(
      [
        [0, 5],
        [10, 20],
      ],
      10,
    ),
    [[0, 5]],
  );
  assert.deepEqual(removeSpanAt([[0, 5]], 3), [[0, 5]]);
});

test('segments round-trips the text, soft newlines included', () => {
  const text = 'First line\nsecond line';
  const segs = segments(text, [[6, 16]]);
  assert.equal(segs.map((s) => s.text).join(''), text);
  assert.deepEqual(
    segs.map((s) => [s.start, s.marked, s.text]),
    [
      [0, false, 'First '],
      [6, true, 'line\nsecon'],
      [16, false, 'd line'],
    ],
  );
});

test('segments clips spans that run past the text', () => {
  assert.deepEqual(segments('abc', [[1, 99]]), [
    { text: 'a', start: 0, marked: false },
    { text: 'bc', start: 1, marked: true },
  ]);
  assert.deepEqual(segments('', []), [{ text: '', start: 0, marked: false }]);
});
