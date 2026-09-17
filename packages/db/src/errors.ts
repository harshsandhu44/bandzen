export class ContentInUseError extends Error {}

export class PublishValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super(`Cannot publish: missing ${issues.join(', ')}`);
    this.issues = issues;
  }
}

/** Raised by the 0033 trigger: content a candidate sat cannot change (#120). */
const SAT_CONTENT = 'BZ001';
const FOREIGN_KEY = '23503';

/**
 * The editor-facing message when a write hit sat content, or null for any
 * other failure. Drizzle wraps the driver's error, so the Postgres code sits
 * somewhere down the `cause` chain.
 */
export function satContentMessage(e: unknown): string | null {
  for (let err = e; err instanceof Object; err = (err as Error).cause) {
    const code = (err as { code?: unknown }).code;
    if (code === SAT_CONTENT) return (err as Error).message;
    if (code === FOREIGN_KEY) {
      return 'Candidates have sat this, so it cannot be deleted. Unpublish it instead.';
    }
  }
  return null;
}

/** Runs a content write, turning a sat-content refusal into ContentInUseError. */
export async function guardSatContent<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (e) {
    const message = satContentMessage(e);
    throw message ? new ContentInUseError(message) : e;
  }
}
