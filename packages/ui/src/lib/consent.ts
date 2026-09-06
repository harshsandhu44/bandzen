/**
 * Cookie-consent state. The cookie is read on the client (see
 * `readConsentCookie`) so the apps' root layouts stay static — a bottom banner
 * that appears a frame after paint is fine, and nothing non-essential loads
 * until the visitor opts in regardless.
 *
 * Only two opt-in categories. "Necessary" is not stored because it is never a
 * choice — auth, the sidebar preference and this cookie itself are always on.
 */

export const CONSENT_COOKIE = 'bz_consent';

/**
 * Bump when the categories or their meaning change. `parseConsent` then treats
 * every older cookie as undecided, so the banner comes back and asks again.
 */
export const CONSENT_VERSION = 1;

/** 180 days — the usual ceiling before consent is considered stale. */
const MAX_AGE = 60 * 60 * 24 * 180;

export type ConsentCategory = 'analytics' | 'marketing';

export type ConsentState = {
  analytics: boolean;
  marketing: boolean;
};

type Stored = { v: number; a: 0 | 1; m: 0 | 1; t: number };

/**
 * Returns `null` for a missing, unparseable or stale-version cookie — all of
 * which mean "ask again". A valid cookie yields the two booleans.
 */
export function parseConsent(
  raw: string | undefined | null,
): ConsentState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<Stored>;
    if (s.v !== CONSENT_VERSION) return null;
    return { analytics: s.a === 1, marketing: s.m === 1 };
  } catch {
    return null;
  }
}

/**
 * The full `document.cookie` assignment string. Host-only (no `Domain`), so
 * apps/web and apps/app each ask once.
 *
 * ponytail: add `Domain=.bandzen.com` and set from a shared parent host if one
 * consent should ever cover both apps.
 */
export function serializeConsent(state: ConsentState): string {
  const value: Stored = {
    v: CONSENT_VERSION,
    a: state.analytics ? 1 : 0,
    m: state.marketing ? 1 : 0,
    t: Math.floor(Date.now() / 1000),
  };
  // Skip `Secure` on plain http so the banner still works when testing from a
  // phone on the LAN (http://192.168.x.x). Prod and localhost are secure.
  const secure =
    typeof location === 'undefined' || location.protocol === 'https:'
      ? '; Secure'
      : '';
  return `${CONSENT_COOKIE}=${JSON.stringify(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax${secure}`;
}

/** Reads and parses the consent cookie in the browser. `null` on the server. */
export function readConsentCookie(): ConsentState | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`),
  );
  return parseConsent(match ? decodeURIComponent(match[1]) : null);
}

export const CONSENT_ALL: ConsentState = { analytics: true, marketing: true };
export const CONSENT_NONE: ConsentState = {
  analytics: false,
  marketing: false,
};
