'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Waveform } from '@bandzen/ui/components/waveform';
import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { clock } from '@/lib/playback';
import { saveListeningAnswer, submitListeningAttempt } from '../actions';

type Track = {
  id: string;
  title: string;
  audioUrl: string;
  peaks: number[] | null;
  durationSeconds: number;
  matchingOptions: string[] | null;
};

/** `heard` counts recordings played to the end; `current` is the one on screen. */
type Progress = { current: number; heard: number };

const noopSubscribe = () => () => {};
const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * One recording from 0:00. No seek and no pause button — `Resume` only
 * appears if something outside the page paused it (a media key, unplugged
 * headphones). Plays once in a mock; a diagnostic can replay a finished
 * recording from the start. Remounted per recording via `key`.
 */
function RecordingPlayer({
  track,
  n,
  total,
  ended,
  replayable,
  onEnded,
  onNext,
}: {
  track: Track;
  n: number;
  total: number;
  ended: boolean;
  replayable: boolean;
  onEnded: () => void;
  onNext: () => void;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused'>('ready');
  const [currentTime, setCurrentTime] = useState(0);
  const duration = track.durationSeconds;
  const shown = ended && status === 'ready' ? duration : currentTime;
  const play = () => void ref.current?.play();
  const replay = () => {
    if (ref.current) ref.current.currentTime = 0;
    play();
  };

  return (
    <div className="space-y-3">
      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Recording {n} of {total}
      </p>
      <audio
        ref={ref}
        src={track.audioUrl}
        preload="auto"
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setStatus('playing')}
        onPause={(e) => {
          if (!e.currentTarget.ended) setStatus('paused');
        }}
        onEnded={() => {
          setStatus('ready');
          onEnded();
        }}
        className="hidden"
      />
      <Waveform
        data={track.peaks ?? undefined}
        progress={duration ? Math.min(1, shown / duration) : 0}
        height={48}
      />
      <div className="flex flex-wrap items-center gap-3">
        {status === 'playing' ? (
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {replayable ? 'Playing' : 'Playing — it plays once'}
          </p>
        ) : status === 'paused' ? (
          <Button type="button" variant="outline" size="sm" onClick={play}>
            <Play aria-hidden /> Resume
          </Button>
        ) : !ended ? (
          <Button type="button" onClick={play}>
            <Play aria-hidden /> Play recording {n}
          </Button>
        ) : (
          <>
            {n < total ? (
              <Button type="button" onClick={onNext}>
                Next recording <ArrowRight aria-hidden />
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                All recordings played. Check your answers, then submit.
              </p>
            )}
            {replayable ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={replay}
              >
                <RotateCcw aria-hidden /> Replay
              </Button>
            ) : null}
          </>
        )}
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {clock(shown)} / {clock(duration)}
        </p>
      </div>
    </div>
  );
}

type Props = {
  attemptId: string;
  /** Diagnostic only: a finished recording can be played again. */
  replayable: boolean;
  tracks: Track[];
  questions: RunnerQuestion[];
  matchingOptionsByQuestion: Record<string, string[] | null>;
  saved: RunnerSaved[];
};

/**
 * The sitting's Listening section: recordings one at a time, each starting
 * at 0:00 when the candidate presses Play, and moving on only when they press
 * Next after it ends. The questions view follows the recording (the navigator
 * can still jump anywhere). Progress lives in localStorage, so a reload keeps
 * finished recordings finished and replays an interrupted one from the start.
 */
export function MockListeningTest({
  attemptId,
  replayable,
  tracks,
  questions,
  matchingOptionsByQuestion,
  saved,
}: Props) {
  const storageKey = `listening-progress-${attemptId}`;
  // The server has no storage; a `null` server snapshot keeps hydration
  // matching, and the client snapshot picks up a reload's saved position.
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => readStorage(storageKey),
    () => null,
  );
  // In-memory copy wins once the candidate acts, so refused storage still works.
  const [local, setLocal] = useState<Progress | null>(null);
  const progress: Progress =
    local ??
    (stored ? (JSON.parse(stored) as Progress) : { current: 0, heard: 0 });

  const save = (next: Progress) => {
    setLocal(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // A private window that refuses storage only loses reload recovery.
    }
  };

  const current = Math.min(progress.current, tracks.length - 1);
  const track = tracks[current];
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
        module="listening"
        pageBy="section"
        sectionId={track.id}
        left={
          <RecordingPlayer
            key={track.id}
            track={track}
            n={current + 1}
            total={tracks.length}
            ended={progress.heard > current}
            replayable={replayable}
            onEnded={() =>
              save({ current, heard: Math.max(progress.heard, current + 1) })
            }
            onNext={() => save({ ...progress, current: current + 1 })}
          />
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
    </>
  );
}
