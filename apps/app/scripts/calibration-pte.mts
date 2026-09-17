import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { sql } from './sql.mts';
import { PTE_SCORING_VERSION } from '../../../packages/exams/src/pte-scoring.ts';
import {
  CALIBRATION_GATE,
  calibrate,
  gateFailures,
  type CalibrationPair,
} from '../src/lib/calibration.ts';

/**
 * Read-only. How far the PTE estimate is from the real scores candidates
 * report back (#121), per scoring version and exam version.
 *
 * A pair is an `official_scores` row joined to its sitting's immutable
 * `exam_score_reports` row, so only finished, finalized sittings can pair.
 * Per-skill estimates come from that report, never copied.
 *
 * Ends with the gate. Until the current scoring version passes it, every
 * surface keeps calling the number a Bandzen estimate.
 *
 * Run: pnpm --filter app analytics:calibration
 */

const rows = await sql<
  {
    scoring_version: string;
    exam_version: string;
    source: string;
    estimate: string | null;
    subscores: Record<string, number | null>;
    task_types: { taskType: string }[];
    official: string;
    listening: string | null;
    reading: string | null;
    speaking: string | null;
    writing: string | null;
  }[]
>`
  select r.scoring_version, r.exam_version, o.source,
         r.overall as estimate, r.subscores, r.task_types,
         o.score as official, o.listening, o.reading, o.speaking, o.writing
    from official_scores o
    join exam_score_reports r on r.mock_attempt_id = o.mock_attempt_id
   where o.exam_key = 'pte_academic'
`;

const num = (v: string | null) => (v == null ? null : Number(v));
const pairs: CalibrationPair[] = rows.map((r) => ({
  scoringVersion: r.scoring_version,
  examVersion: r.exam_version,
  estimate: { overall: num(r.estimate), subscores: r.subscores },
  official: {
    overall: Number(r.official),
    skills: {
      listening: num(r.listening),
      reading: num(r.reading),
      speaking: num(r.speaking),
      writing: num(r.writing),
    },
  },
  taskTypes: r.task_types.map((t) => t.taskType),
}));

console.log(
  `${pairs.length} pair(s); ${rows.filter((r) => r.source === 'official_practice').length} from official practice tests.`,
);

const groups = calibrate(pairs);
for (const g of groups) {
  console.log(`\n=== ${g.scoringVersion} · exam ${g.examVersion} ===`);
  console.log('overall (error = estimate − official)');
  console.table([g.overall]);
  for (const [title, table] of [
    ['per skill', g.skills],
    ['by official overall band', g.bands],
    ['by task type sat', g.taskTypes],
    ['by skills the estimate could not measure', g.missingSkills],
  ] as const) {
    console.log(title);
    console.table(table);
  }
}

const current = groups.filter((g) => g.scoringVersion === PTE_SCORING_VERSION);
const { minPairs, maxMae, maxBandBias } = CALIBRATION_GATE;
console.log(
  `\nGate for ${PTE_SCORING_VERSION}: n ≥ ${minPairs}, overall MAE ≤ ${maxMae}, |bias| ≤ ${maxBandBias} in every band.`,
);
if (!current.length) {
  console.log('FAIL: no pairs on the current scoring version.');
}
for (const g of current) {
  const failures = gateFailures(g);
  console.log(
    failures.length
      ? `FAIL (exam ${g.examVersion}): ${failures.join('; ')}`
      : `PASS (exam ${g.examVersion})`,
  );
}

process.exit(0);
