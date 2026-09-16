import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preparationWrites } from './enrollment.ts';

test('an IELTS save writes the enrollment and nothing IELTS-only on the profile', () => {
  const { enrollment, profile } = preparationWrites({
    examKey: 'ielts',
    examVariant: 'general',
    targetScore: 7.5,
    selfAssessedScore: null,
    testDate: '2026-12-01',
    studyMinutes: 45,
  });

  assert.deepEqual(enrollment, {
    examKey: 'ielts',
    examVersion: '2026',
    examVariant: 'general',
    targetScore: 7.5,
    selfAssessedScore: null,
    testDate: '2026-12-01',
  });
  assert.equal(profile.activeExamKey, 'ielts');
  assert.equal(profile.studyMinutes, 45);
  // The legacy IELTS columns are no longer written, for IELTS least of all —
  // it was the only exam that ever mirrored into them.
  for (const key of [
    'examType',
    'targetBand',
    'selfAssessedBand',
    'testDate',
  ]) {
    assert.equal(key in profile, false, key);
  }
});

test('a partial save leaves the fields it does not mention undefined', () => {
  // The diagnostic sets a target and date only; the variant must survive.
  const { enrollment, profile } = preparationWrites({
    targetScore: 6.5,
    testDate: null,
  });

  assert.equal(enrollment.examVariant, undefined);
  assert.equal(enrollment.selfAssessedScore, undefined);
  assert.equal(enrollment.targetScore, 6.5);
  assert.equal(profile.activeExamKey, undefined);
  assert.equal('onboardingCompletedAt' in profile, false);
});

test('no exam touches the IELTS-only profile columns', () => {
  const { enrollment, profile } = preparationWrites({
    examKey: 'pte_academic',
    targetScore: 79,
  });

  assert.equal(enrollment.examVersion, '2025-08-07');
  assert.equal(enrollment.targetScore, 79);
  assert.equal(profile.activeExamKey, 'pte_academic');
  assert.equal('targetBand' in profile, false);
  assert.equal('examType' in profile, false);
});
