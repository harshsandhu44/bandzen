import { getExam, getTask } from './registry.ts';
import { roundToScale } from './scale.ts';
import type { ExamScoreReport } from './scoring.ts';
import type { ScoringTrait, Skill, TaskScoring } from './types.ts';

/**
 * PTE Academic's estimate: per-task evidence aggregated onto the 10-90 scale.
 *
 * Pearson does not publish how its traits and raw marks combine into a score,
 * so this cannot reproduce it and does not pretend to. What it does is honest
 * and calibratable: turn each task into a fraction of what it was worth, share
 * that fraction across the skills the task actually measures — eight of PTE's
 * 22 types are integrated, so Repeat Sentence counts towards listening AND
 * speaking — and map the weighted result onto 10-90.
 *
 * Every number this produces is a Bandzen estimate. `PTE_SCORING_VERSION` is
 * stamped alongside it so a later comparison against real results knows which
 * arithmetic produced which estimate.
 */

export const PTE_SCORING_VERSION = 'pte-2025-08-07.v2';

/**
 * One marked task's contribution. Structurally an `AssessmentResult`, so an
 * attempt's stored assessment can be passed straight in.
 */
export type TaskOutcome = {
  taskType: string;
  dimensions: Record<string, number | null>;
  measuredSkills: readonly { skill: Skill; weight: number }[];
};

/**
 * How much of the task the candidate got, 0 to 1: raw points earned over raw
 * points available, as `correct` of `total`.
 *
 * Both kinds of task store it that way. A deterministic task's evaluator
 * writes its marks; a model-graded task's grader writes the sum of its items'
 * trait points after the task's gates (`scoreItem`), because only it knows
 * each item's maximum. Null when there is nothing to read — an unanswered or
 * ungraded task, which must not be scored as a zero, because a task nobody
 * marked is not the same as a task marked badly.
 */
export function taskFraction(outcome: TaskOutcome): number | null {
  const { correct, total } = outcome.dimensions;
  // Both halves, not just the denominator. A marked task writes them together,
  // so `total` with a null `correct` is a task that was never marked — and
  // `correct ?? 0` would have scored it a flat zero, which is the one answer
  // this function exists to avoid giving.
  if (typeof total === 'number' && total > 0 && typeof correct === 'number') {
    return Math.min(1, Math.max(0, correct / total));
  }
  return null;
}

// ---------------------------------------------------------------------------
// Raw item scoring
// ---------------------------------------------------------------------------

/** Lowercase words with punctuation stripped, which is what PTE compares. */
export function wordsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, ''))
    .filter(Boolean);
}

/** Replacements, omissions and insertions: word-level edit distance. */
function wordErrors(reference: string[], said: string[]): number {
  let prev = Array.from({ length: said.length + 1 }, (_, j) => j);
  for (let i = 1; i <= reference.length; i++) {
    const row = [i];
    for (let j = 1; j <= said.length; j++) {
      row[j] = Math.min(
        prev[j]! + 1,
        row[j - 1]! + 1,
        prev[j - 1]! + (reference[i - 1] === said[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[said.length]!;
}

/** Words of the reference said in the reference's order. */
function wordsInSequence(reference: string[], said: string[]): number {
  let prev = new Array<number>(said.length + 1).fill(0);
  for (let i = 1; i <= reference.length; i++) {
    const row = [0];
    for (let j = 1; j <= said.length; j++) {
      row[j] =
        reference[i - 1] === said[j - 1]
          ? prev[j - 1]! + 1
          : Math.max(prev[j]!, row[j - 1]!);
    }
    prev = row;
  }
  return prev[said.length]!;
}

/**
 * Read Aloud Content: one point per word of the text, less one per replaced,
 * omitted or inserted word. Its maximum is the text's length.
 */
export function readAloudContent(
  text: string,
  transcript: string,
): { score: number; max: number } {
  const reference = wordsOf(text);
  const errors = wordErrors(reference, wordsOf(transcript));
  return {
    score: Math.max(0, reference.length - errors),
    max: reference.length,
  };
}

/**
 * Repeat Sentence Content, 0-3: all words of the sentence in sequence; at
 * least half; less than half; almost nothing. Hesitations and anything said
 * before or after are ignored, which a longest-in-order match does naturally.
 *
 * ponytail: "almost nothing" has no published threshold; under a fifth of the
 * words is ours. Revisit with #121's paired results if it proves harsh.
 */
export function repeatSentenceContent(
  sentence: string,
  transcript: string,
): number {
  const reference = wordsOf(sentence);
  if (!reference.length) return 0;
  const share =
    wordsInSequence(reference, wordsOf(transcript)) / reference.length;
  if (share === 1) return 3;
  if (share >= 0.5) return 2;
  if (share >= 0.2) return 1;
  return 0;
}

/**
 * Answer Short Question, 1 or 0: an accepted answer said somewhere in the
 * response, so "it's a thermometer" is as right as "thermometer".
 */
export function answerShortQuestion(
  accepted: readonly string[],
  transcript: string,
): number {
  const said = ` ${wordsOf(transcript).join(' ')} `;
  return accepted.some((a) => {
    const words = wordsOf(a);
    return words.length > 0 && said.includes(` ${words.join(' ')} `);
  })
    ? 1
    : 0;
}

const countWords = (body: string) => wordsOf(body).length;

/** Written in capitals, which every PTE Form rule scores zero. */
const shouted = (body: string) =>
  /[A-Z]/.test(body) && body === body.toUpperCase();

const unpunctuated = (body: string) => !/[.,;:!?]/.test(body);

/** Every non-empty line a bullet: a list, not prose. */
const bulleted = (body: string) => {
  const lines = body.split('\n').filter((l) => l.trim());
  return (
    lines.length > 0 && lines.every((l) => /^\s*([-*\u2022]|\d+[.)])\s/.test(l))
  );
};

/**
 * Form, scored in code from the response itself, per the guide's word bands.
 * Summarize Written Text, 0-1: one single complete sentence of 5-75 words.
 * Write Essay, 0-2: 200-300 words, else 120-199 or 301-380. Summarize Spoken
 * Text, 0-2: 50-70 words, else 40-49 or 71-100. Capitals score zero on all
 * three; no punctuation and bullet points on the last two.
 *
 * ponytail: "one sentence" is one terminal mark, at the end. An abbreviation
 * like "e.g." mid-sentence reads as two sentences; add an allowlist if that
 * bites real responses.
 */
export function formScore(taskType: string, body: string): number {
  const text = body.trim();
  const words = countWords(text);
  const within = (min: number, max: number) => words >= min && words <= max;

  if (taskType === 'summarize_written_text') {
    const oneSentence =
      /[.!?]$/.test(text) && !/[.!?]\s+\S/.test(text) && !text.includes('\n');
    return within(5, 75) && oneSentence && !shouted(text) ? 1 : 0;
  }

  const bands =
    taskType === 'write_essay'
      ? {
          full: [200, 300],
          part: [
            [120, 199],
            [301, 380],
          ],
        }
      : taskType === 'summarize_spoken_text'
        ? {
            full: [50, 70],
            part: [
              [40, 49],
              [71, 100],
            ],
          }
        : null;
  if (!bands) throw new Error(`No Form rule for ${taskType}`);
  if (shouted(text) || unpunctuated(text) || bulleted(text)) return 0;
  if (within(bands.full[0]!, bands.full[1]!)) return 2;
  return bands.part.some(([min, max]) => within(min!, max!)) ? 1 : 0;
}

/**
 * One item's raw points under its task's contract.
 *
 * `scores` holds every trait the contract names; `referenceWords` resolves a
 * trait whose maximum is the item's own length. Scores are clamped to their
 * trait's range and rounded, so a model answering 7 on a 0-6 trait cannot
 * earn more than the trait is worth. A gate at zero voids the response —
 * Pearson gives no points at all, however good the other traits were.
 *
 * Null when a trait is missing: an item that was not fully marked has no
 * score, which is different from a score of zero.
 */
export function scoreItem(
  scoring: TaskScoring,
  scores: Readonly<Record<string, number | null | undefined>>,
  referenceWords = 0,
): { points: number; max: number } | null {
  const top = (t: ScoringTrait) =>
    t.max === 'reference_words' ? referenceWords : t.max;
  const max = scoring.traits.reduce((n, t) => n + top(t), 0);
  const marked = (t: ScoringTrait) => {
    const raw = scores[t.key];
    return typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(top(t), Math.max(0, Math.round(raw)))
      : null;
  };

  // A response voided by any gate is not marked further, so the traits after
  // it may legitimately be absent — Form is checked before a grader is paid
  // to read an essay that is 90 words long.
  if (scoring.traits.some((t) => t.gate && marked(t) === 0)) {
    return { points: 0, max };
  }
  let points = 0;
  for (const trait of scoring.traits) {
    const score = marked(trait);
    if (score == null) return null;
    points += score;
  }
  return { points, max };
}

/** A fraction of the way up the exam's own scale. */
function onScale(fraction: number): number {
  const scale = getExam('pte_academic')!.scoreScale;
  return roundToScale(scale, scale.min + fraction * (scale.max - scale.min));
}

/**
 * Each skill's weighted fraction, or null where nothing measured it. A task
 * measuring two skills contributes its weight to both, which is what keeps an
 * integrated task from being filed under one skill and lost to the other.
 */
export function pteSkillFractions(
  outcomes: readonly TaskOutcome[],
): Record<Skill, number | null> {
  const got: Record<string, number> = {};
  const possible: Record<string, number> = {};

  for (const outcome of outcomes) {
    const fraction = taskFraction(outcome);
    if (fraction == null) continue;
    for (const { skill, weight } of outcome.measuredSkills) {
      got[skill] = (got[skill] ?? 0) + weight * fraction;
      possible[skill] = (possible[skill] ?? 0) + weight;
    }
  }

  const fractions = {} as Record<Skill, number | null>;
  for (const skill of [
    'reading',
    'writing',
    'listening',
    'speaking',
  ] as const) {
    const total = possible[skill] ?? 0;
    fractions[skill] = total > 0 ? (got[skill] ?? 0) / total : null;
  }
  return fractions;
}

/** The task types sat, worst first — what a study plan should point at. */
export function pteWeakestTaskTypes(
  outcomes: readonly TaskOutcome[],
): { taskType: string; fraction: number }[] {
  const byType = new Map<string, number[]>();
  for (const outcome of outcomes) {
    const fraction = taskFraction(outcome);
    if (fraction == null) continue;
    byType.set(outcome.taskType, [
      ...(byType.get(outcome.taskType) ?? []),
      fraction,
    ]);
  }
  return [...byType]
    .map(([taskType, fs]) => ({
      taskType,
      fraction: fs.reduce((a, b) => a + b, 0) / fs.length,
    }))
    .sort((a, b) => a.fraction - b.fraction);
}

/**
 * The sitting's estimate: overall, per skill, and per section.
 *
 * Overall is the mean of the skills actually measured, not of four assumed
 * ones — a candidate who sat only Reading gets a Reading estimate and no
 * invented Listening score.
 *
 * The mean is a placeholder. Pearson's score guide says outright that the
 * overall score is not an average of the communicative skills scores, and does
 * not publish what it is instead, so closing that gap needs paired real
 * results rather than a better reading of the guide — see issue #121.
 */
export function pteScoreReport(
  outcomes: readonly TaskOutcome[],
): ExamScoreReport {
  const exam = getExam('pte_academic')!;
  const fractions = pteSkillFractions(outcomes);

  const sections: Record<string, number | null> = {};
  for (const section of exam.sections) {
    const inSection = outcomes.filter(
      (o) => getTask('pte_academic', o.taskType)?.section === section.key,
    );
    const got = inSection
      .map(taskFraction)
      .filter((f): f is number => f != null);
    sections[section.key] = got.length
      ? onScale(got.reduce((a, b) => a + b, 0) / got.length)
      : null;
  }

  const skills = {} as Record<string, number | null>;
  for (const [skill, fraction] of Object.entries(fractions)) {
    skills[skill] = fraction == null ? null : onScale(fraction);
  }

  const measured = Object.values(skills).filter((s): s is number => s != null);

  return {
    overall: measured.length
      ? roundToScale(
          exam.scoreScale,
          measured.reduce((a, b) => a + b, 0) / measured.length,
        )
      : null,
    sections,
    subscores: skills,
    scale: exam.scoreScale,
    estimated: true,
  };
}
