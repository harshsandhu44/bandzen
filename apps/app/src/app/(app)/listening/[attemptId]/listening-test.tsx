'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Waveform } from '@bandzen/ui/components/waveform';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import {
  saveListeningAnswer,
  saveListeningPlayback,
  submitListeningAttempt,
} from '../actions';

const clock = (seconds: number) => {
  const whole = Math.floor(seconds) || 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

type Props = {
  attemptId: string;
  track: {
    title: string;
    audioUrl: string;
    matchingOptions: string[] | null;
    peaks: number[] | null;
  };
  questions: RunnerQuestion[];
  saved: RunnerSaved[];
};

/**
 * Practice audio with a real transport: pause/resume, seek, and replay once
 * it ends. Deliberately *unlike* the exam and unlike `mock-listening-test`,
 * whose audio is still single-play — practice is for going back over the bit
 * you missed. Everything the candidate does here is counted and flushed to
 * the attempt, and the review page says which kind of listen it was.
 *
 * Seeking is a transparent `<input type="range">` layered over the waveform
 * rather than a click handler on it: arrow keys, Home/End and drag all come
 * for free, and `Waveform` stays non-interactive for its other four callers.
 */
function Player({
  attemptId,
  audioUrl,
  peaks,
}: {
  attemptId: string;
  audioUrl: string;
  peaks: number[] | null;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'paused' | 'ended'>(
    'idle',
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Counters live in a ref: they are written from event handlers and read by
  // the flush, and none of it belongs in render.
  const counts = useRef({ pauses: 0, seeks: 0, listenedSeconds: 0 });
  const flush = useCallback(() => {
    void saveListeningPlayback({ attemptId, ...counts.current });
  }, [attemptId]);

  // Wall clock, not `currentTime` deltas — accumulating those double-counts a
  // replay and goes negative on a backward seek. Also drives the flush while
  // playing, so a candidate who never pauses still has their time recorded
  // when they submit mid-track.
  useEffect(() => {
    if (state !== 'playing') return;
    const audio = ref.current;
    let last = Date.now();
    let sinceFlush = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const delta = (now - last) / 1000;
      last = now;
      counts.current.listenedSeconds += delta;
      sinceFlush += delta;
      if (sinceFlush >= 10) {
        sinceFlush = 0;
        flush();
      }
      if (audio) setCurrentTime(audio.currentTime);
    }, 100);
    return () => clearInterval(id);
  }, [state, flush]);

  const seekTo = (seconds: number) => {
    const audio = ref.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrentTime(seconds);
    if (state === 'ended') setState('paused');
  };

  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="space-y-3">
      <audio
        ref={ref}
        src={audioUrl}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setState('ended');
          flush();
        }}
        className="hidden"
      />

      <div className="relative">
        <Waveform data={peaks ?? undefined} progress={progress} height={48} />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          disabled={state === 'idle'}
          aria-label="Seek"
          // Continuous while dragging or held; `onChange` below is what counts
          // the seek, so one drag is one seek rather than forty.
          onInput={(e) => seekTo(Number(e.currentTarget.value))}
          onChange={() => {
            counts.current.seeks += 1;
            flush();
          }}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default"
        />
      </div>

      {state === 'idle' ? (
        <Button
          type="button"
          onClick={() => {
            void ref.current?.play();
            setState('playing');
          }}
        >
          Start listening
        </Button>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const audio = ref.current;
              if (!audio) return;
              if (state === 'playing') {
                audio.pause();
                counts.current.pauses += 1;
                setState('paused');
                flush();
                return;
              }
              if (state === 'ended') audio.currentTime = 0;
              void audio.play();
              setState('playing');
            }}
          >
            {state === 'playing' ? (
              <>
                <Pause className="size-3.5" aria-hidden /> Pause
              </>
            ) : state === 'ended' ? (
              <>
                <RotateCcw className="size-3.5" aria-hidden /> Replay
              </>
            ) : (
              <>
                <Play className="size-3.5" aria-hidden /> Resume
              </>
            )}
          </Button>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            {clock(currentTime)} / {clock(duration)}
          </p>
        </div>
      )}
    </div>
  );
}

export function ListeningTest({ attemptId, track, questions, saved }: Props) {
  const optionLabel = (i: number) => String.fromCharCode(65 + i);
  const matchingOptions =
    track.matchingOptions?.map((o, i) => ({
      value: o,
      label: `${optionLabel(i)} — ${o}`,
    })) ?? null;

  return (
    <ObjectiveRunner
      attemptId={attemptId}
      splitId="listening"
      left={
        <>
          <h1 className="mb-6 font-title text-title">{track.title}</h1>
          <Player
            attemptId={attemptId}
            audioUrl={track.audioUrl}
            peaks={track.peaks}
          />
        </>
      }
      optionsList={
        track.matchingOptions?.length ? (
          <section className="mb-8 border border-border p-4">
            <h2 className="mb-3 font-title text-title">List of options</h2>
            <ol className="space-y-1.5">
              {track.matchingOptions.map((option, i) => (
                <li key={option} className="flex gap-3 text-sm">
                  <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground">
                    {optionLabel(i)}
                  </span>
                  <span>{option}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : undefined
      }
      questions={questions}
      saved={saved}
      saveAction={saveListeningAnswer}
      submitAction={submitListeningAttempt}
      choicesFor={(q) =>
        q.kind === 'multiple_choice' ? (q.options ?? null) : null
      }
      selectOptionsFor={(q) => (q.kind === 'matching' ? matchingOptions : null)}
    />
  );
}
