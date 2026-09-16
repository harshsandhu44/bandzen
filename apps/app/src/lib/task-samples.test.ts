import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMS } from '@bandzen/exams/registry';
import { sampleTask } from './task-samples.ts';

test('every task of every exam gets a sample its renderer can draw', () => {
  for (const exam of EXAMS) {
    for (const task of exam.tasks) {
      const { stimulus, item } = sampleTask(task, 'https://audio.test/a.mp3');
      const where = `${exam.key}/${task.key}`;
      assert.ok(item.prompt, where);

      if (task.stimulus === 'text') assert.ok(stimulus.text, where);
      if (task.stimulus === 'audio') assert.ok(stimulus.audioUrl, where);
      if (task.stimulus === 'image') assert.ok(stimulus.imageUrl, where);

      switch (task.renderer) {
        case 'choice_cards':
        case 'choice_select':
        case 'multi_choice':
          assert.ok((item.options?.length ?? 0) >= 2, where);
          break;
        case 'fill_blank':
          assert.ok(item.gapped?.includes('___'), where);
          break;
        case 'token_select':
          assert.ok((item.tokens?.length ?? 0) >= 2, where);
          break;
        case 'fill_blank_select': {
          const gaps = (item.gapped ?? '').split('___').length - 1;
          assert.ok(gaps >= 1, where);
          assert.equal(item.gapOptions?.length, gaps, where);
          break;
        }
        case 'fill_blank_drag': {
          const gaps = (item.gapped ?? '').split('___').length - 1;
          assert.ok(gaps >= 1, where);
          assert.ok((item.options?.length ?? 0) >= gaps, where);
          break;
        }
        case 'reorder':
        case 'sentence_builder':
          assert.ok((item.tokens?.length ?? 0) >= 2, where);
          break;
        case 'conversation':
          assert.ok(item.turns?.length, where);
          assert.ok((item.responseSeconds ?? 0) > 0, where);
          break;
        case 'recording':
          assert.ok((item.responseSeconds ?? 0) > 0, where);
          break;
      }
    }
  }
});

test('a task-timed sample carries the task window', () => {
  const task = EXAMS.find((e) => e.key === 'pte_academic')!.tasks.find(
    (t) => t.key === 'read_aloud',
  )!;
  const { item } = sampleTask(task, null);
  assert.equal(item.prepSeconds, 35);
  assert.equal(item.responseSeconds, 40);
});
