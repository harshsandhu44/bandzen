/**
 * Campaign attribution parsed out of a landing URL.
 *
 * PostHog reads these off `window.location` itself, but only at the moment it
 * captures — and consent is opt-in, so by the time the visitor accepts they may
 * already have navigated off the URL that carried the UTMs. The component
 * stashes the landing href and feeds it through here instead.
 *
 * The property names are PostHog's own (`utm_source`, `gclid`, …) so its
 * attribution breakdowns pick them up with no mapping.
 */

/** Exactly what PostHog treats as campaign params, minus the ad-network noise. */
const CAMPAIGN_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
] as const;

/**
 * Returns only the params actually present — an empty object for a bare URL, so
 * `register_once` on it is a no-op rather than writing a row of empty strings.
 *
 * Never throws: a URL this cannot parse is a URL with no attribution in it.
 */
export function campaignParams(url: string): Record<string, string> {
  let params: URLSearchParams;
  try {
    params = new URL(url).searchParams;
  } catch {
    return {};
  }

  const found: Record<string, string> = {};
  for (const key of CAMPAIGN_PARAMS) {
    const value = params.get(key);
    if (value) found[key] = value;
  }
  return found;
}
