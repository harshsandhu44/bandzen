'use client';

import { Mic } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { startPcmRecording, type PcmRecorder } from '@/lib/pcm-recorder';
import type { ResponseRendererProps } from './responses';

type Phase = 'idle' | 'prep' | 'recording' | 'uploading' | 'done' | 'failed';

/**
 * One-shot recording: an optional preparation countdown, then a capped
 * recording that stops itself, and no second take — which is how PTE, TOEFL
 * and DET speaking tasks run. Reuses the Speaking module's PCM recorder, so it
 * produces the same 16 kHz WAV the graders accept.
 *
 * The take is uploaded the moment it stops, the same "never lose work"
 * contract the Speaking module keeps, and the answer becomes its stored URL.
 * Without an `onUpload` — the task lab, which has nowhere to put one — it
 * falls back to an object URL that lives only as long as the tab.
 */
function OneShot({
  prepSeconds,
  responseSeconds,
  url,
  onDone,
  onUpload,
  auto,
}: {
  prepSeconds: number;
  responseSeconds: number;
  url: string;
  onDone: (url: string) => void;
  onUpload?: (blob: Blob) => Promise<string | null>;
  auto?: { ready: boolean; spent: boolean };
}) {
  const [phase, setPhase] = useState<Phase>(url ? 'done' : 'idle');
  const [left, setLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // A take that recorded fine but failed to upload. Kept so the candidate can
  // resend it: there is no second take, so losing the bytes loses the answer.
  const [unsent, setUnsent] = useState<Blob | null>(null);
  const deadline = useRef(0);
  const recorder = useRef<PcmRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  // Held in a ref, not a dependency: the runner rebuilds this callback on
  // every render, and re-running the countdown effect would restart the clock
  // mid-recording.
  const upload = useRef(onUpload);
  useEffect(() => {
    upload.current = onUpload;
  }, [onUpload]);

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
        if (!upload.current) {
          setPhase('done');
          onDone(URL.createObjectURL(wav));
          return;
        }
        setPhase('uploading');
        const stored = await upload.current(wav).catch(() => null);
        // There is no second take, so a failed upload has to say so rather
        // than leaving a take that looks saved and is not.
        if (!stored) {
          setUnsent(wav);
          setError('Your answer was recorded but not saved. Retry the upload.');
          setPhase('failed');
          return;
        }
        setPhase('done');
        onDone(stored);
      } catch {
        setError('That take was not saved. Check your microphone and network.');
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

  // A mock does not wait for the candidate: preparation starts the moment the
  // stimulus is over, exactly as the real test's does.
  const autoReady = Boolean(auto?.ready && !auto.spent);
  useEffect(() => {
    if (!autoReady || phase !== 'idle' || url) return;
    // Scheduled rather than called: starting sets state, and the effect only
    // decides that it is time to.
    const id = setTimeout(start, 0);
    return () => clearTimeout(id);
    // `start` is recreated each render and only reads props; running this
    // once per readiness change is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReady, phase, url]);

  const resend = async () => {
    if (!unsent || !upload.current) return;
    setError(null);
    setPhase('uploading');
    const stored = await upload.current(unsent).catch(() => null);
    if (!stored) {
      setError('Still not saved. Check your connection and retry.');
      setPhase('failed');
      return;
    }
    setUnsent(null);
    setPhase('done');
    onDone(stored);
  };

  if (auto?.spent && !url) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        This task was started on an earlier visit and cannot be answered again.
        It stays unanswered — move on to the next one.
      </p>
    );
  }

  const finishEarly = () => {
    deadline.current = Date.now();
  };

  return (
    <div className="space-y-3">
      {phase === 'idle' && auto ? (
        <p role="status" className="font-mono text-sm text-muted-foreground">
          Recording starts when the audio ends
        </p>
      ) : null}
      {phase === 'idle' && !auto ? (
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
      {phase === 'uploading' ? (
        <p role="status" className="font-mono text-sm text-muted-foreground">
          Saving your answer…
        </p>
      ) : null}
      {phase === 'done' && url ? (
        <audio controls src={url} className="w-full max-w-sm" />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {unsent && phase === 'failed' ? (
        <Button type="button" variant="outline" size="sm" onClick={resend}>
          Retry upload
        </Button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        One take · {responseSeconds}s to answer
      </p>
    </div>
  );
}

export function Recording({
  item,
  value,
  onChange,
  onUpload,
  auto,
}: ResponseRendererProps) {
  return (
    <OneShot
      prepSeconds={item.prepSeconds ?? 0}
      responseSeconds={item.responseSeconds ?? 60}
      url={value}
      onDone={onChange}
      onUpload={onUpload}
      auto={auto}
    />
  );
}

/**
 * A multi-turn speaking task (TOEFL Take an Interview, DET Interactive
 * Speaking): each examiner turn gets its own one-shot answer, and the next turn
 * appears only once the previous one is answered. The answer is a JSON array of
 * take URLs, one per turn.
 */
export function Conversation({
  item,
  value,
  onChange,
  onUpload,
}: ResponseRendererProps) {
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
            onUpload={onUpload}
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
