'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Waveform } from '@bandzen/ui/components/waveform';
import {
  ObjectiveRunner,
  type RunnerQuestion,
  type RunnerSaved,
} from '@/components/exam/objective-runner';
import { saveListeningAnswer, submitListeningAttempt } from '../actions';

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
 * A single-play audio element with no scrub bar — exam realism, deliberate.
 * The candidate presses once and listens; there is no going back. The
 * waveform below is a playback-position visual only — it never wires up
 * `Waveform`'s `onBarClick`, so there is no way to seek.
 */
function Player({
  audioUrl,
  peaks,
}: {
  audioUrl: string;
  peaks: number[] | null;
}) {
  const ref = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = ref.current;
    if (!audio || state !== 'playing') return;
    const id = setInterval(() => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    }, 100);
    return () => clearInterval(id);
  }, [state]);

  return (
    <div className="space-y-3">
      <audio
        ref={ref}
        src={audioUrl}
        onEnded={() => {
          setState('ended');
          setProgress(1);
        }}
        className="hidden"
      />
      <Waveform data={peaks ?? undefined} progress={progress} height={48} />
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
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          {state === 'playing' ? 'Playing — it plays once' : 'Audio finished'}
        </p>
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
          <Player audioUrl={track.audioUrl} peaks={track.peaks} />
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
