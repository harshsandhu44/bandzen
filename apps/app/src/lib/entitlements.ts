/**
 * Who may do what, and how much of it is left.
 *
 * Pure, for the same reason `grading.ts` and `study-plan.ts` are: every
 * function takes its inputs as arguments and touches no database, so
 * `pnpm test` covers the boundaries — at the limit, one over, the edge of the
 * rolling window — without a fixture. `queries.ts` supplies the counts, and
 * the server actions and `/api/coach` compose the two.
 */

const DAY_MS = 86_400_000;

/**
 * The whole of entitlement: is there time left on the clock.
 *
 * Everything falls out of this one comparison. A cancellation keeps the period
 * already paid for, because cancelling does not move the date. A failed
 * renewal simply never extends it, so Razorpay's retry window becomes a grace
 * period at no cost. A comped account — the founding cohort, a trial — is a
 * row with a future date and no Razorpay id, so it needs no special case here
 * or anywhere else.
 *
 * Razorpay's `status` is never consulted. It exists to render a banner
 * ("renewal failed — update payment"), not to decide access.
 */
export function isProAt(
  proUntil: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return proUntil != null && proUntil > now;
}

/**
 * The metered surfaces are the ones that cost money to serve. Reading is
 * unlimited on Free because `grading.ts` is pure — marking a reading attempt
 * costs nothing, and capping it would throttle the habit that produces a
 * paying candidate in the first place.
 */
export const QUOTA_WINDOW_DAYS = 7;
export const FREE_ESSAYS_PER_WINDOW = 2;
export const FREE_COACH_MESSAGES_PER_WINDOW = 10;

/** A new candidate's reverse trial, and the founding cohort's thank-you. */
export const TRIAL_DAYS = 7;
export const FOUNDING_GRANT_DAYS = 90;

const WINDOW_MS = QUOTA_WINDOW_DAYS * DAY_MS;

/** The instant the rolling window opens. Everything older has fallen out. */
export function windowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - WINDOW_MS);
}

export type Allowance = {
  allowed: boolean;
  /** Pro. The counts below are meaningless when this is set, and unread. */
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
  /**
   * When the next slot frees up, or null when one is already free. Rolling
   * windows can state this exactly, which is the whole reason to prefer them
   * over a calendar month: "next Thursday" is a scheduled reason to return,
   * where "the 1st" can be twenty-seven days of nothing.
   */
  resetsAt: Date | null;
};

/**
 * Deliberately not `Infinity`: this shape crosses the server/client boundary
 * for Coach, and `Infinity` does not survive JSON. A boolean says the same
 * thing and cannot arrive as `null`.
 */
const UNLIMITED: Allowance = {
  allowed: true,
  unlimited: true,
  used: 0,
  limit: 0,
  remaining: 0,
  resetsAt: null,
};

/**
 * What is left of a metered allowance.
 *
 * `used` is the timestamps of the things that spent it, not a count, because
 * the reset date cannot be derived from a count. Anything outside the window
 * is ignored here rather than in the query, so the boundary is testable.
 */
export function allowance(input: {
  isPro: boolean;
  used: Date[];
  limit: number;
  now?: Date;
}): Allowance {
  if (input.isPro) return UNLIMITED;

  const now = input.now ?? new Date();
  const start = windowStart(now).getTime();
  const inWindow = input.used
    .filter((d) => d.getTime() > start)
    .sort((a, b) => a.getTime() - b.getTime());

  const remaining = Math.max(0, input.limit - inWindow.length);

  // The slot frees when enough of the oldest entries have aged out. With a
  // limit of 2 and two used, that is the older one; if a race let three
  // through, it is the second. `used.length - limit` picks the right entry in
  // both cases, and is out of range exactly when something is already free.
  const blocking = inWindow[inWindow.length - input.limit];

  return {
    allowed: remaining > 0,
    unlimited: false,
    used: inWindow.length,
    limit: input.limit,
    remaining,
    resetsAt:
      remaining > 0 || !blocking
        ? null
        : new Date(blocking.getTime() + WINDOW_MS),
  };
}

/**
 * The first diagnostic is free and does not touch the essay allowance.
 *
 * It is the demonstration — the marketing site's second call to action points
 * straight at it — and charging a candidate's first act against a weekly
 * budget would punish them for doing what they were told to do. Retaking one
 * is Pro: three weeks later, "have I actually moved" is worth paying for.
 */
export function canStartDiagnostic(input: {
  isPro: boolean;
  taken: number;
}): boolean {
  return input.isPro || input.taken === 0;
}

/** Full mock sittings a Pro candidate may start per rolling week. */
export const MOCK_TESTS_PER_WINDOW = 1;

/**
 * Whether a mock sitting may start.
 *
 * Free cannot start one at all — Speaking is already Pro-only, and a mock
 * commits three LLM grading calls (two essays, one speaking test) the moment
 * it starts. Pro is capped, not unlimited: `allowance` is called with
 * `isPro: false` even for a Pro candidate, because its unconditional
 * "Pro is unlimited" shortcut is exactly wrong here — the cap is the whole
 * point once someone can reach this feature at all.
 */
export function canStartMock(input: {
  isPro: boolean;
  startsInWindow: Date[];
  now?: Date;
}): Allowance {
  if (!input.isPro) {
    return {
      allowed: false,
      unlimited: false,
      used: 0,
      limit: 0,
      remaining: 0,
      resetsAt: null,
    };
  }
  return allowance({
    isPro: false,
    used: input.startsInWindow,
    limit: MOCK_TESTS_PER_WINDOW,
    now: input.now,
  });
}

/** When a grant of `days` should expire, measured from now. */
export function grantEndsAt(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * DAY_MS);
}

// ---------------------------------------------------------------------------
// The plan catalogue
// ---------------------------------------------------------------------------

/**
 * Amounts are in paise, which is what Razorpay charges in. Plan ids are not
 * here: they are Razorpay's, they differ between test and live mode, and they
 * belong with the rest of the credentials in `razorpay.ts`.
 *
 * Two plans, not one and not three. A lone price has nothing to be compared
 * against; an annual plan would be a decoy, since nobody prepares for IELTS
 * for twelve months.
 */
export const PLANS = [
  {
    key: 'monthly',
    label: 'Monthly',
    months: 1,
    founding: 99_900,
    standard: 149_900,
    featured: false,
  },
  {
    key: 'quarterly',
    label: '3 months',
    months: 3,
    founding: 199_900,
    standard: 299_900,
    featured: true,
  },
] as const;

export type Plan = (typeof PLANS)[number];
export type PlanKey = Plan['key'];

export function planByKey(key: string): Plan | null {
  return PLANS.find((p) => p.key === key) ?? null;
}

/**
 * Whether the founding price still stands.
 *
 * An unset date means the window is closed, not open: charging the standard
 * price by mistake is recoverable, and a deadline that never arrives is the
 * fake-urgency pattern this product does not use.
 */
export function isFoundingActive(
  endsAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  return endsAt != null && now < endsAt;
}

export function priceOf(plan: Plan, founding: boolean): number {
  return founding ? plan.founding : plan.standard;
}

/** What one month of a plan works out at, for the per-month comparison. */
export function perMonth(plan: Plan, founding: boolean): number {
  return Math.round(priceOf(plan, founding) / plan.months);
}

/** What the longer plan saves against paying monthly, as whole percent. */
export function savingsPercent(plan: Plan, founding: boolean): number {
  const monthly = PLANS[0];
  if (plan.months === 1) return 0;
  const full = priceOf(monthly, founding) * plan.months;
  return Math.round((1 - priceOf(plan, founding) / full) * 100);
}

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Paise to "₹599". Rupees only — nothing here is ever priced in paise. */
export function formatInr(paise: number): string {
  return INR.format(paise / 100);
}

/**
 * The daily reframing that sits beside the real monthly figure, never instead
 * of it. Rounded up, so it is never flattering by accident.
 */
export function perDay(plan: Plan, founding: boolean): string {
  return formatInr(Math.ceil(perMonth(plan, founding) / 30));
}
