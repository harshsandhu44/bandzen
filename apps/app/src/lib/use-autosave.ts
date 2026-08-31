'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounced autosave that does not lose an answer when a save fails.
 *
 * The engines previously swallowed the rejection, so a dropped connection
 * looked exactly like a successful save and the answer was gone. This retries
 * with backoff, re-reads the newest payload on every attempt so a retry never
 * writes a stale value over a newer one, and surfaces a terminal failure so
 * the candidate is told before they submit.
 *
 * This is the substance behind an exam engine's SAVING and RECONNECTING
 * states. It is behaviour rather than an enum, and it lives in one hook so
 * the reading and writing engines cannot drift apart.
 */

export type AutosaveStatus = 'idle' | 'saving' | 'reconnecting' | 'failed';

const RETRY_DELAYS = [1000, 3000, 8000];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useAutosave<T>(
  save: (payload: T) => Promise<unknown>,
  { delay = 700 }: { delay?: number } = {},
) {
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  // The newest payload per key, read fresh on every attempt.
  const latest = useRef(new Map<string, T>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const failed = useRef(new Set<string>());
  const inFlight = useRef(0);

  const flush = useCallback(
    async (key: string) => {
      inFlight.current += 1;
      setStatus((s) => (s === 'failed' ? s : 'saving'));

      try {
        for (let tries = 0; ; tries += 1) {
          const payload = latest.current.get(key);
          if (payload === undefined) break;

          try {
            await save(payload);
            failed.current.delete(key);
            break;
          } catch {
            if (tries >= RETRY_DELAYS.length) {
              failed.current.add(key);
              break;
            }
            setStatus('reconnecting');
            await wait(RETRY_DELAYS[tries]!);
          }
        }
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0) {
          setStatus(failed.current.size ? 'failed' : 'idle');
        }
      }
    },
    [save],
  );

  const schedule = useCallback(
    (key: string, payload: T) => {
      latest.current.set(key, payload);
      clearTimeout(timers.current.get(key));
      setStatus((s) => (s === 'failed' ? s : 'saving'));
      timers.current.set(
        key,
        setTimeout(() => void flush(key), delay),
      );
    },
    [delay, flush],
  );

  /** Send everything that failed, now. Bound to the retry affordance. */
  const retryFailed = useCallback(() => {
    const keys = [...failed.current];
    failed.current.clear();
    setStatus(keys.length ? 'saving' : 'idle');
    for (const key of keys) void flush(key);
  }, [flush]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
    };
  }, []);

  // A candidate who closes the tab mid-save should be warned. The browser
  // decides whether to show its prompt; we only mark the page as dirty.
  useEffect(() => {
    if (status === 'idle') return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  return { status, schedule, retryFailed };
}
