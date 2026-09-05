'use client';

import { useEffect, useState } from 'react';

/**
 * A non-blocking nudge when the tab loses focus during a timed mock section —
 * decision was a soft warning, not enforcement: no lock, no logging, nothing
 * that could false-positive on a candidate checking a dictionary tab. Fires
 * at most once per mount; the caller decides how (and whether) to clear it.
 */
export function useBlurWarning(active: boolean) {
  const [warned, setWarned] = useState(false);

  useEffect(() => {
    if (!active) return;
    const onBlur = () => setWarned(true);
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [active]);

  return { warned, dismiss: () => setWarned(false) };
}
