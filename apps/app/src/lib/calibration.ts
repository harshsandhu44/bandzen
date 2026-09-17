/**
 * How far Bandzen's PTE estimates sit from the real scores candidates report
 * back (#121). Pure: `scripts/calibration-pte.mts` feeds it pairs from
 * `official_scores` joined to the immutable `exam_score_reports` row.
 *
 * Every error is signed as estimate − official, so a positive bias means
 * Bandzen scores too generously.
 */

export type CalibrationPair = {
  scoringVersion: string;
  examVersion: string;
  estimate: {
    overall: number | null;
    subscores: Record<string, number | null>;
  };
  official: { overall: number; skills: Record<string, number | null> };
  taskTypes: string[];
};

export type ErrorStats = { n: number; mae: number | null; bias: number | null };

export type CalibrationGroup = {
  scoringVersion: string;
  examVersion: string;
  overall: ErrorStats;
  skills: Record<string, ErrorStats>;
  /** By the official overall, in 10-point bands ("50–59"). */
  bands: Record<string, ErrorStats>;
  /** Overall error across the pairs whose sitting included each task type. */
  taskTypes: Record<string, ErrorStats>;
  /** Overall error by which skills the estimate could not measure ("none" when all). */
  missingSkills: Record<string, ErrorStats>;
};

/**
 * The bar the estimate must clear before any copy calls it more than a broad
 * Bandzen estimate. Set before there was data to tune it against, on purpose.
 */
export const CALIBRATION_GATE = { minPairs: 30, maxMae: 3, maxBandBias: 2 };

const round = (x: number) => Math.round(x * 100) / 100;

function stats(errors: number[]): ErrorStats {
  if (!errors.length) return { n: 0, mae: null, bias: null };
  const mean = (f: (e: number) => number) =>
    round(errors.reduce((acc, e) => acc + f(e), 0) / errors.length);
  return { n: errors.length, mae: mean(Math.abs), bias: mean((e) => e) };
}

function collect(into: Map<string, number[]>, key: string, error: number) {
  into.set(key, [...(into.get(key) ?? []), error]);
}

const toStats = (m: Map<string, number[]>) =>
  Object.fromEntries(
    [...m]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, stats(v)]),
  );

export function bandOf(score: number) {
  const lo = Math.floor(score / 10) * 10;
  return `${lo}–${lo + 9}`;
}

export function calibrate(pairs: CalibrationPair[]): CalibrationGroup[] {
  const groups = new Map<string, CalibrationPair[]>();
  for (const p of pairs) {
    const key = `${p.scoringVersion} / ${p.examVersion}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return [...groups.values()].map((group) => {
    const overall: number[] = [];
    const skills = new Map<string, number[]>();
    const bands = new Map<string, number[]>();
    const taskTypes = new Map<string, number[]>();
    const missing = new Map<string, number[]>();

    for (const p of group) {
      for (const [skill, truth] of Object.entries(p.official.skills)) {
        const guess = p.estimate.subscores[skill];
        if (truth != null && guess != null) {
          collect(skills, skill, guess - truth);
        }
      }
      // A sitting with no overall estimate still calibrates its skills.
      if (p.estimate.overall == null) continue;
      const error = p.estimate.overall - p.official.overall;
      overall.push(error);
      collect(bands, bandOf(p.official.overall), error);
      for (const t of new Set(p.taskTypes)) collect(taskTypes, t, error);
      const unmeasured = Object.entries(p.estimate.subscores)
        .filter(([, v]) => v == null)
        .map(([k]) => k)
        .sort();
      collect(missing, unmeasured.join('+') || 'none', error);
    }

    return {
      scoringVersion: group[0]!.scoringVersion,
      examVersion: group[0]!.examVersion,
      overall: stats(overall),
      skills: toStats(skills),
      bands: toStats(bands),
      taskTypes: toStats(taskTypes),
      missingSkills: toStats(missing),
    };
  });
}

/** Why a group fails the gate; empty when it passes. */
export function gateFailures(group: CalibrationGroup): string[] {
  const { minPairs, maxMae, maxBandBias } = CALIBRATION_GATE;
  const failures: string[] = [];
  if (group.overall.n < minPairs) {
    failures.push(`${group.overall.n} of ${minPairs} pairs`);
  }
  if (group.overall.mae != null && group.overall.mae > maxMae) {
    failures.push(`overall MAE ${group.overall.mae} > ${maxMae}`);
  }
  for (const [band, s] of Object.entries(group.bands)) {
    if (s.bias != null && Math.abs(s.bias) > maxBandBias) {
      failures.push(`band ${band} bias ${s.bias} beyond ±${maxBandBias}`);
    }
  }
  return failures;
}
