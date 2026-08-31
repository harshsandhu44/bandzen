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
 * How long the diagnostic takes: one reading passage, then one Task 2 essay.
 * Derived from the same rules the engines enforce, so the number a candidate
 * is promised is the number the timers actually give them.
 */
export const DIAGNOSTIC_MINUTES =
  minutesFor(SEEDED_QUESTIONS_PER_PASSAGE) + taskRules(2).minutes;

/** The diagnostic's length, for prose. */
export const DIAGNOSTIC_DURATION_LABEL = `${DIAGNOSTIC_MINUTES} min`;

/** A single reading section's allowance, for prose. */
export const READING_SECTION_DURATION_LABEL = `${minutesFor(
  SEEDED_QUESTIONS_PER_PASSAGE,
)} min`;

/** A single Task 2 essay's allowance, for prose. */
export const WRITING_TASK2_DURATION_LABEL = `${taskRules(2).minutes} min`;
