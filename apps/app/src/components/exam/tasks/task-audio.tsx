'use client';

import { useEffect, useRef, useState } from 'react';
import type { TaskAudioPolicy } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';

/**
 * An audio stimulus under the exam's own rules. PTE plays every recording once
 * and starts it for you, so there is no transport here at all: no seek bar, no
 * pause, and no replay once the plays are spent.
 *
 * The policy is enforced here rather than in the task components because the
 * IELTS mock already showed what the alternative looks like — a `replayable`
 * boolean threaded through one component, which the next runner cannot reuse.
 */
export function TaskAudio({
  src,
  policy,
}: {
  src: string;
  policy: TaskAudioPolicy;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [played, setPlayed] = useState(0);
  const [waiting, setWaiting] = useState(policy.startDelaySeconds ?? 0);
  const spent = played >= policy.plays;

  // The delay before the real test starts speaking. Counted down visibly, so
  // the silence reads as the test beginning rather than as a broken player.
  useEffect(() => {
    if (!policy.autoplay || waiting <= 0) return;
    const id = setTimeout(() => setWaiting((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [policy.autoplay, waiting]);

  useEffect(() => {
    if (!policy.autoplay || waiting > 0 || played > 0) return;
    // A rejected autoplay leaves the Play button as the way through, so the
    // candidate is never stuck behind a policy the browser refused.
    void ref.current?.play().catch(() => {});
  }, [policy.autoplay, waiting, played]);

  const remaining = policy.plays - played;

  return (
    <div className="space-y-2">
      <audio
        ref={ref}
        src={src}
        preload="auto"
        onEnded={() => setPlayed((n) => n + 1)}
      />
      <div className="flex items-center gap-3">
        {!spent && (!policy.autoplay || played > 0) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void ref.current?.play().catch(() => {})}
          >
            Play
          </Button>
        ) : null}
        <p role="status" className="font-mono text-xs text-muted-foreground">
          {waiting > 0
            ? `Begins in ${waiting}s`
            : spent
              ? 'Played'
              : policy.plays === 1
                ? 'Plays once'
                : `${remaining} play${remaining === 1 ? '' : 's'} left`}
        </p>
      </div>
    </div>
  );
}
