/**
 * Exam timing. The engines' allowances, in one place.
 *
 * These were two files under the route folders, which meant nothing outside a
 * route could state how long a test takes -- and so /tests and /diagnostic each
 * hardcoded a different guess ("1h 20m" and "about 35 minutes") for the same
 * eighty-minute-looking thing that actually runs an hour.
 */

/** IELTS Reading is 60 minutes for 40 questions; scale shorter sets to match. */
export function minutesFor(questionCount: number) {
  return Math.max(5, Math.round((questionCount / 40) * 60));
}

/** Task 1 is 20 minutes and at least 150 words; Task 2 is 40 and at least 250. */
export const taskRules = (task: number) =>
  task === 1 ? { minutes: 20, minWords: 150 } : { minutes: 40, minWords: 250 };

/**
 * Questions on a seeded passage. Every passage in `content/passages/` has 13,
 * and the diagnostic takes the easiest one.
 *
 * ponytail: a constant, not a query. Stating the diagnostic's length costs a
 * database round trip otherwise, on two pages that need nothing else from it.
 * If passages stop having a uniform question count, make this a query.
 */
export const SEEDED_QUESTIONS_PER_PASSAGE = 13;

/**
 * The diagnostic's Reading and Writing clocks. Literal, like
 * `MOCK_SECTION_MINUTES` and for the same reason — real IELTS gives a fixed
 * allowance regardless of question count. Reading is 40 (two passages, not the
 * mock's three); Writing is 40 (`taskRules(2).minutes` — a Task-2-only
 * section, never the mock's 60 which pays for two tasks).
 */
export const DIAGNOSTIC_SECTION_MINUTES = { reading: 40, writing: 40 } as const;

/** The diagnostic's length, for prose. Listening's real length depends on the 2 tracks picked. */
export const DIAGNOSTIC_DURATION_LABEL = 'About 1 hr 15 min';

/** A single reading section's allowance, for prose. */
export const READING_SECTION_DURATION_LABEL = `${minutesFor(
  SEEDED_QUESTIONS_PER_PASSAGE,
)} min`;

/** A single Task 2 essay's allowance, for prose. */
export const WRITING_TASK2_DURATION_LABEL = `${taskRules(2).minutes} min`;

/**
 * The mock's Reading and Writing clocks. Literal, not derived from
 * `minutesFor`/`taskRules`: real IELTS gives 60 minutes for Reading and 60
 * for Writing regardless of how many questions or which two tasks a
 * particular sitting has, and the mock's 3 randomly-assembled passages won't
 * land on exactly 40 questions. `minutesFor(SEEDED_QUESTIONS_PER_PASSAGE * 3)`
 * would give 59, not 60 -- close enough to be a worse bug than an unused import.
 */
export const MOCK_SECTION_MINUTES = { reading: 60, writing: 60 } as const;

/** A sitting section's clock, by which kind of sitting it belongs to. */
export const sittingSectionMinutes = (
  kind: 'mock' | 'diagnostic',
  section: 'reading' | 'writing',
) =>
  (kind === 'diagnostic' ? DIAGNOSTIC_SECTION_MINUTES : MOCK_SECTION_MINUTES)[
    section
  ];

/** Silent pause between mock Listening tracks, while the next section's questions can be read ahead. */
export const LISTENING_TRACK_PAUSE_SECONDS = 30;

/** The mock's length, for prose. An estimate — Listening's real length depends on the 4 tracks picked. */
export const MOCK_DURATION_LABEL = 'About 2 hr 45 min';
