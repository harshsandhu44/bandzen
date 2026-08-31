/**
 * Calendar arithmetic on plain ISO dates.
 *
 * `profiles.test_date` is a `date`, not a timestamp — an exam is on a day, not
 * at an instant — so everything here compares midnight-to-midnight in UTC and
 * never applies a zone offset to a value that has none.
 */

const DAY_MS = 86_400_000;

/** Today as YYYY-MM-DD, in the candidate's zone when we know it. */
export function todayIso(timezone?: string | null): string {
  if (!timezone) return new Date().toISOString().slice(0, 10);
  try {
    // en-CA formats as YYYY-MM-DD, which is what we want to compare against.
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(
      new Date(),
    );
  } catch {
    // An unknown zone is not worth failing a page render over.
    return new Date().toISOString().slice(0, 10);
  }
}

/** Whole days from today until an ISO date. Negative once it has passed. */
export function daysUntil(isoDate: string, from = todayIso()): number {
  const target = Date.parse(`${isoDate}T00:00:00Z`);
  const start = Date.parse(`${from}T00:00:00Z`);
  if (Number.isNaN(target) || Number.isNaN(start)) return 0;
  return Math.round((target - start) / DAY_MS);
}

/** The UTC instants bounding one calendar day in a given zone. */
export function dayBounds(isoDate: string, timezone?: string | null) {
  const start = new Date(`${isoDate}T00:00:00Z`);
  const end = new Date(start.getTime() + DAY_MS);
  if (!timezone) return { start, end };

  // Shift by the zone's offset so "today" means their today, not UTC's.
  const offsetMs = zoneOffsetMs(start, timezone);
  return {
    start: new Date(start.getTime() - offsetMs),
    end: new Date(end.getTime() - offsetMs),
  };
}

function zoneOffsetMs(at: Date, timezone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(at);
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? '0');
    const asUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour') % 24,
      get('minute'),
      get('second'),
    );
    return asUtc - at.getTime();
  } catch {
    return 0;
  }
}
