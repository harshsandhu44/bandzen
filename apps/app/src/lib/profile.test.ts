import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileSchema } from './profile.ts';

const base = { testDate: '', studyMinutes: '45', timezone: 'Asia/Kolkata' };

test('an IELTS profile keeps its variant and half-band target', () => {
  const parsed = profileSchema.parse({
    ...base,
    examKey: 'ielts',
    examVariant: 'general',
    targetScore: '7.5',
    selfAssessedScore: '',
  });
  assert.equal(parsed.examVariant, 'general');
  assert.equal(parsed.targetScore, 7.5);
  assert.equal(parsed.selfAssessedScore, null);
  assert.equal(parsed.testDate, null);
});

test('IELTS without Academic or General is refused', () => {
  const result = profileSchema.safeParse({
    ...base,
    examKey: 'ielts',
    examVariant: '',
    targetScore: '7',
  });
  assert.equal(result.success, false);
  assert.match(
    result.error!.issues[0]!.message,
    /Academic or General Training/,
  );
});

test('another exam never inherits a variant', () => {
  const parsed = profileSchema.parse({
    ...base,
    examKey: 'pte_academic',
    examVariant: 'academic',
    targetScore: '79',
  });
  assert.equal(parsed.examVariant, null);
});

test('scores are checked against the chosen exam, not IELTS', () => {
  const pte = (targetScore: string) =>
    profileSchema.safeParse({ ...base, examKey: 'pte_academic', targetScore })
      .success;
  assert.equal(pte('79'), true);
  // A perfectly good IELTS band is not a PTE score.
  assert.equal(pte('7.5'), false);
  assert.equal(pte('95'), false);

  const det = profileSchema.safeParse({
    ...base,
    examKey: 'det',
    targetScore: '115',
    selfAssessedScore: '112',
  });
  assert.equal(det.success, false);
  assert.match(
    det.error!.issues[0]!.message,
    /Duolingo English Test score from 10 to 160 in steps of 5/,
  );
});

test('an unknown exam is refused', () => {
  assert.equal(
    profileSchema.safeParse({ ...base, examKey: 'cambridge', targetScore: '7' })
      .success,
    false,
  );
});
