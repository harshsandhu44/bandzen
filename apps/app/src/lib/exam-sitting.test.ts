import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExam } from '@bandzen/exams/registry';
import {
  composeSitting,
  skillForTaskType,
  skillsInSitting,
  tasksForSkill,
  type PublishedTask,
} from './exam-sitting.ts';

const pte = getExam('pte_academic')!;

const published: PublishedTask[] = [
  { id: 'ra1', taskType: 'read_aloud', section: 'speaking_writing' },
  { id: 'ra2', taskType: 'read_aloud', section: 'speaking_writing' },
  { id: 'we1', taskType: 'write_essay', section: 'speaking_writing' },
  { id: 'ro1', taskType: 'reorder_paragraphs', section: 'reading' },
  { id: 'wfd1', taskType: 'write_from_dictation', section: 'listening' },
];

test('a sitting runs task types in the order the exam declares them', () => {
  const ids = composeSitting(pte, published, 1);
  // Speaking & Writing first, Listening last — the opposite end from IELTS.
  assert.deepEqual(ids, ['ra1', 'we1', 'ro1', 'wfd1']);
});

test('each task type contributes at most the configured number of items', () => {
  assert.deepEqual(composeSitting(pte, published, 2), [
    'ra1',
    'ra2',
    'we1',
    'ro1',
    'wfd1',
  ]);
});

test('a task type with nothing published is simply absent', () => {
  const ids = composeSitting(pte, [published[3]!], 1);
  assert.deepEqual(ids, ['ro1']);
});

test('an integrated task is sat under its part, not its first skill', () => {
  // Read Aloud measures reading AND speaking. It is a spoken task in the
  // Speaking & Writing part, so it must not be sat in the Reading section.
  assert.equal(skillForTaskType('pte_academic', 'read_aloud'), 'speaking');
  assert.equal(skillForTaskType('pte_academic', 'write_essay'), 'writing');
  // Write from Dictation measures listening and writing, and is typed, but it
  // belongs to the Listening section, which covers one skill.
  assert.equal(
    skillForTaskType('pte_academic', 'write_from_dictation'),
    'listening',
  );
  assert.equal(skillForTaskType('pte_academic', 'unknown_task'), null);
});

test('a sitting splits into the skills it has content for, in section order', () => {
  const ids = composeSitting(pte, published, 1);
  assert.deepEqual(skillsInSitting('pte_academic', published, ids), [
    'speaking',
    'writing',
    'reading',
    'listening',
  ]);
  assert.deepEqual(tasksForSkill('pte_academic', published, ids, 'writing'), [
    'we1',
  ]);
});
