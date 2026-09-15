'use client';

import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { startPcmRecording, type PcmRecorder } from '@/lib/pcm-recorder';
import type { ResponseRendererProps } from './responses';

type Phase = 'idle' | 'prep' | 'recording' | 'done' | 'failed';

/**
 * One-shot recording: an optional preparation countdown, then a capped
 * recording that stops itself, and no second take — which is how PTE, TOEFL
 * and DET speaking tasks run. Reuses the Speaking module's PCM recorder, so it
 * produces the same 16 kHz WAV the graders accept. The answer is an object URL
 * for the take; uploading it is the attempt's business, not the renderer's.
 */
function OneShot({
  prepSeconds,
  responseSeconds,
  url,
  onDone,
}: {
  prepSeconds: number;
  responseSeconds: number;
  url: string;
  onDone: (url: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>(url ? 'done' : 'idle');
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const deadline = useRef(0);
  const recorder = useRef<PcmRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const release = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  useEffect(() => {
    if (phase !== 'prep' && phase !== 'recording') return;

    const stop = async () => {
      const r = recorder.current;
      recorder.current = null;
      if (!r) return;
      try {
        const { wav, peak } = await r.stop();
        if (peak < 0.002) throw new Error('silent');
        setPhase('done');
        onDone(URL.createObjectURL(wav));
      } catch {
        setError('Nothing was recorded. Check the microphone.');
        setPhase('failed');
      } finally {
        release();
      }
    };

    const begin = async () => {
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        recorder.current = await startPcmRecording(stream.current);
        deadline.current = Date.now() + responseSeconds * 1000;
        setPhase('recording');
      } catch {
        release();
        setError('No microphone access. Allow the mic and reload.');
        setPhase('failed');
      }
    };

    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setLeft(remaining);
      if (remaining > 0) return;
      clearInterval(id);
      if (phase === 'prep') void begin();
      else void stop();
    }, 250);
    return () => clearInterval(id);
  }, [phase, responseSeconds, onDone]);

  useEffect(
    () => () => {
      void recorder.current?.stop().catch(() => {});
      release();
    },
    [],
  );

  const start = () => {
    setError(null);
    deadline.current = Date.now() + prepSeconds * 1000;
    setLeft(prepSeconds);
    setPhase('prep');
  };

  const finishEarly = () => {
    deadline.current = Date.now();
  };

  return (
    <div className="space-y-3">
      {phase === 'idle' ? (
        <Button type="button" onClick={start}>
          <Mic aria-hidden />
          {prepSeconds
            ? `Start (${prepSeconds}s to prepare)`
            : 'Start recording'}
        </Button>
      ) : null}
      {phase === 'prep' ? (
        <p role="status" className="font-mono text-sm tabular-nums">
          Prepare · {left}s
        </p>
      ) : null}
      {phase === 'recording' ? (
        <div className="flex items-center gap-4">
          <p
            role="status"
            className="font-mono text-sm text-destructive tabular-nums"
          >
            ● Recording · {left}s left
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={finishEarly}
          >
            Finish
          </Button>
        </div>
      ) : null}
      {phase === 'done' && url ? (
        <audio controls src={url} className="w-full max-w-sm" />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        One take · {responseSeconds}s to answer
      </p>
    </div>
  );
}

export function Recording({ item, value, onChange }: ResponseRendererProps) {
  return (
    <OneShot
      prepSeconds={item.prepSeconds ?? 0}
      responseSeconds={item.responseSeconds ?? 60}
      url={value}
      onDone={onChange}
    />
  );
}

/**
 * A multi-turn speaking task (TOEFL Take an Interview, DET Interactive
 * Speaking): each examiner turn gets its own one-shot answer, and the next turn
 * appears only once the previous one is answered. The answer is a JSON array of
 * take URLs, one per turn.
 */
export function Conversation({ item, value, onChange }: ResponseRendererProps) {
  let takes: string[] = [];
  try {
    takes = JSON.parse(value || '[]') as string[];
  } catch {
    takes = [];
  }
  const turns = item.turns ?? [];
  const shown = Math.min(turns.length, takes.length + 1);

  return (
    <ol className="space-y-6">
      {turns.slice(0, shown).map((turn, i) => (
        <li key={i} className="space-y-3">
          <p className="text-sm">
            <span className="mr-2 font-mono text-xs text-muted-foreground">
              Examiner
            </span>
            {turn}
          </p>
          <OneShot
            prepSeconds={item.prepSeconds ?? 0}
            responseSeconds={item.responseSeconds ?? 45}
            url={takes[i] ?? ''}
            onDone={(url) => {
              const next = [...takes];
              next[i] = url;
              onChange(JSON.stringify(next));
            }}
          />
        </li>
      ))}
    </ol>
  );
}
