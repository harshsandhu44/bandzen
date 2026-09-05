'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Waveform } from '@bandzen/ui/components/waveform';
import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { trackIndexAtElapsed } from '@/lib/mock';
import { LISTENING_TRACK_PAUSE_SECONDS } from '@/lib/timing';
import { saveListeningAnswer, submitListeningAttempt } from '../actions';

type Track = {
  id: string;
  title: string;
  audioUrl: string;
  peaks: number[] | null;
  durationSeconds: number;
  matchingOptions: string[] | null;
};

/**
 * 4 tracks, one clock. The section's `startedAt` is the anchor —
 * `trackIndexAtElapsed` derives which track should be playing and how far
 * into it from real elapsed time, so a reload lands on the right track
 * instead of restarting at the first one, the same wall-clock-anchoring
 * `Timer` already gives Reading and Writing. No scrub bar, no manual "next
 * track": the derived state, ticking once a second, is what advances things.
 */
function MultiTrackPlayer({
  tracks,
  startedAt,
  onDone,
}: {
  tracks: Track[];
  startedAt: string;
  onDone: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const donefiredRef = useRef(false);
  const loadedIndexRef = useRef(-1);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = (now - new Date(startedAt).getTime()) / 1000;
  const durations = tracks.map((t) => t.durationSeconds);
  const derived = trackIndexAtElapsed(
    elapsed,
    durations,
    LISTENING_TRACK_PAUSE_SECONDS,
  );
  // Read fresh inside the track-load effect below without making it a
  // dependency — re-running that effect every tick would reset playback to
  // this offset every second instead of just once, on an actual track change.
  const offsetRef = useRef(derived.offsetSeconds);
  useEffect(() => {
    offsetRef.current = derived.offsetSeconds;
  });

  useEffect(() => {
    if (derived.done && !donefiredRef.current) {
      donefiredRef.current = true;
      onDone();
    }
  }, [derived.done, onDone]);

  // Load and play the current track once per index change, seeked to where
  // elapsed time says playback should be. Harmless on a natural advance
  // (offsetSeconds is near zero); what it's for is a reload mid-track.
  useEffect(() => {
    if (!started || derived.inPause || derived.done) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (loadedIndexRef.current !== derived.index) {
      loadedIndexRef.current = derived.index;
      audio.src = tracks[derived.index].audioUrl;
      audio.currentTime = offsetRef.current;
      void audio.play();
    }
  }, [started, derived.index, derived.inPause, derived.done, tracks]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;
    const id = setInterval(() => setCurrentTime(audio.currentTime), 100);
    return () => clearInterval(id);
  }, [started, derived.index]);

  if (!started) {
    return (
      <Button
        type="button"
        onClick={() => {
          setStarted(true);
          setNow(Date.now());
        }}
      >
        Begin listening
      </Button>
    );
  }

  if (derived.done) {
    return (
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Listening finished
      </p>
    );
  }

  const track = tracks[derived.index];
  const progress = track.durationSeconds
    ? Math.min(1, currentTime / track.durationSeconds)
    : 0;

  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Recording {derived.index + 1} of {tracks.length}
      </p>
      <audio ref={audioRef} className="hidden" />
      {derived.inPause ? (
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Reviewing — the next recording begins shortly
        </p>
      ) : (
        <>
          <Waveform
            data={track.peaks ?? undefined}
            progress={progress}
            height={48}
          />
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Playing — it plays once
          </p>
        </>
      )}
    </div>
  );
}

type Props = {
  attemptId: string;
  startedAt: string;
  tracks: Track[];
  questions: RunnerQuestion[];
  matchingOptionsByQuestion: Record<string, string[] | null>;
  saved: RunnerSaved[];
};

export function MockListeningTest({
  attemptId,
  startedAt,
  tracks,
  questions,
  matchingOptionsByQuestion,
  saved,
}: Props) {
  const autoFormRef = useRef<HTMLFormElement>(null);
  const optionLabel = (i: number) => String.fromCharCode(65 + i);

  const matchingOptionsFor = (q: RunnerQuestion) => {
    const options = matchingOptionsByQuestion[q.id];
    if (!options?.length) return null;
    return options.map((o, i) => ({
      value: o,
      label: `${optionLabel(i)} — ${o}`,
    }));
  };

  return (
    <>
      <MockBlurBanner />
      <ObjectiveRunner
        attemptId={attemptId}
        splitId="mock-listening"
        left={
          <MultiTrackPlayer
            tracks={tracks}
            startedAt={startedAt}
            onDone={() => autoFormRef.current?.requestSubmit()}
          />
        }
        optionsList={
          tracks.some((t) => t.matchingOptions?.length) ? (
            <div className="mb-8 space-y-4">
              {tracks.map((t, i) =>
                t.matchingOptions?.length ? (
                  <section key={t.id} className="border border-border p-4">
                    <h2 className="mb-3 font-title text-title">
                      Recording {i + 1} — list of options
                    </h2>
                    <ol className="space-y-1.5">
                      {t.matchingOptions.map((option, j) => (
                        <li key={option} className="flex gap-3 text-sm">
                          <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                            {optionLabel(j)}
                          </span>
                          <span>{option}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null,
              )}
            </div>
          ) : undefined
        }
        questions={questions}
        saved={saved}
        saveAction={saveListeningAnswer}
        submitAction={submitListeningAttempt}
        choicesFor={(q) =>
          q.kind === 'multiple_choice' ? (q.options ?? null) : null
        }
        selectOptionsFor={(q) =>
          q.kind === 'matching' ? matchingOptionsFor(q) : null
        }
      />
      <form
        ref={autoFormRef}
        action={submitListeningAttempt}
        className="hidden"
      >
        <input type="hidden" name="attemptId" value={attemptId} />
      </form>
    </>
  );
}
