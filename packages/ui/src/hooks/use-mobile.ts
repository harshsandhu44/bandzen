import { useSyncExternalStore } from 'react';

/** Matches the sidebar's own `md:` breakpoints. Change both or neither. */
const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

/**
 * Whether the viewport is phone-sized.
 *
 * The generated version of this hook set state synchronously inside an effect,
 * which trips `react-hooks/set-state-in-effect` and costs an extra render on
 * every mount. useSyncExternalStore reads the media query directly and gives
 * React an explicit server snapshot instead — the same approach the app's
 * ThemeToggle already uses for the same class of problem.
 *
 * The server snapshot is `false`: the server cannot measure a viewport, and
 * desktop is what the `md:` classes assume before any JavaScript runs.
 */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
