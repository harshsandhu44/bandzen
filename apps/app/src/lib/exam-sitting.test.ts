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
  const { taskIds } = composeSitting(pte, published);
  // Speaking & Writing first, Listening last — the opposite end from IELTS.
  // Both Read Aloud items are taken: the format asks for six.
  assert.deepEqual(taskIds, ['ra1', 'ra2', 'we1', 'ro1', 'wfd1']);
});

test('a task type contributes no more items than the format asks for', () => {
  // Write Essay is one item in a real PTE, however many are published.
  const essays: PublishedTask[] = [
    { id: 'we1', taskType: 'write_essay', section: 'speaking_writing' },
    { id: 'we2', taskType: 'write_essay', section: 'speaking_writing' },
  ];
  assert.deepEqual(composeSitting(pte, essays).taskIds, ['we1']);
});

test('a sitting says how far short of the real format it falls', () => {
  // 65 is the shortest real PTE; five items is not a mock, and the caller is
  // the one that has to say so.
  assert.equal(composeSitting(pte, published).demanded, 65);
  assert.equal(composeSitting(pte, published).taskIds.length, 5);
});

test('a task type with nothing published is simply absent', () => {
  const { taskIds } = composeSitting(pte, [published[3]!]);
  assert.deepEqual(taskIds, ['ro1']);
});

test('an integrated task is sat under its part, not its first skill', () => {
  // Summarize Written Text measures reading AND writing. It is a typed task in
  // the Speaking & Writing part, so it is sat under Writing, not Reading.
  assert.equal(
    skillForTaskType('pte_academic', 'summarize_written_text'),
    'writing',
  );
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
  const { taskIds: ids } = composeSitting(pte, published);
  assert.deepEqual(skillsInSitting('pte_academic', published, ids), [
    'speaking',
    'writing',
    'reading',
    'listening',
  ]);
  assert.deepEqual(tasksForSkill('pte_academic', published, ids, 'writing'), [
    'we1',
  ]);
  assert.deepEqual(tasksForSkill('pte_academic', published, ids, 'speaking'), [
    'ra1',
    'ra2',
  ]);
});
