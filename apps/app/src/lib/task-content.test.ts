import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTask } from '@bandzen/exams/registry';
import { itemFromContent } from './task-content.ts';

test('stored task content becomes what the renderers draw, without a key', () => {
  const task = getTask('pte_academic', 'read_aloud')!;
  const { stimulus, item } = itemFromContent(task, {
    prompt: 'Read the text aloud.',
    stimulus: {
      text: 'Rivers.',
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
    },
    options: ['A', 'B'],
    gapped: null,
    tokens: null,
    turns: null,
    timing: null,
    difficulty: 2,
  });
  assert.equal(stimulus.text, 'Rivers.');
  assert.deepEqual(item.options, [
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
  ]);
  // No per-item timing: the definition's window applies.
  assert.equal(item.prepSeconds, 35);
  assert.equal(item.responseSeconds, 40);
  assert.equal('answer' in item, false);
});

test("an item's own timing overrides its definition's", () => {
  const task = getTask('pte_academic', 'read_aloud')!;
  const { item } = itemFromContent(task, {
    prompt: 'x',
    stimulus: { text: 'y', audioUrl: null, imageUrl: null, imageAlt: null },
    options: null,
    gapped: null,
    tokens: null,
    turns: null,
    timing: { prepSeconds: 5, responseSeconds: 20 },
    difficulty: 3,
  });
  assert.equal(item.prepSeconds, 5);
  assert.equal(item.responseSeconds, 20);
});
