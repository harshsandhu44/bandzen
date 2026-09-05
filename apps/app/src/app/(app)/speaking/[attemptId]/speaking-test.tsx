'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Mic, Play, Square } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { LiveWaveform } from '@bandzen/ui/components/live-waveform';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import { ExamNavigator } from '@/components/exam/exam-navigator';
import { MockBlurBanner } from '@/components/exam/mock-blur-banner';
import { startPcmRecording, type PcmRecorder } from '@/lib/pcm-recorder';
import { saveSpeakingRecording, submitSpeakingAttempt } from '../actions';

type Prompt = {
  id: string;
  idx: number;
  part: number;
  text: string;
  cueCardPoints: string[] | null;
  prepSeconds: number;
  audioUrl: string | null;
};

type Props = {
  attemptId: string;
  title: string;
  prompts: Prompt[];
  saved: {
    promptId: string;
    audioUrl: string;
    durationSeconds: number | null;
  }[];
  /** The soft tab-blur warning is a mock-only exam-condition guardrail. */
  mock?: boolean;
};

type Status = 'none' | 'uploading' | 'saved' | 'failed';

/** How long a candidate may speak, by part. Auto-stops at the cap. */
const MAX_SECONDS: Record<number, number> = { 1: 45, 2: 120, 3: 60 };

const PART_TITLE: Record<number, string> = {
  1: 'Part 1 — Interview',
  2: 'Part 2 — Long turn',
  3: 'Part 3 — Discussion',
};

const mmss = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function SpeakingTest({
  attemptId,
  title,
  prompts,
  saved,
  mock = false,
}: Props) {
  const [current, setCurrent] = useState(() => {
    const done = new Set(saved.map((s) => s.promptId));
    const next = prompts.findIndex((p) => !done.has(p.id));
    return next === -1 ? 0 : next;
  });

  const [status, setStatus] = useState<Record<string, Status>>(() =>
    Object.fromEntries(saved.map((s) => [s.promptId, 'saved' as Status])),
  );

  const [phase, setPhase] = useState<'idle' | 'prep' | 'recording'>('idle');
  const [left, setLeft] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const recorderRef = useRef<PcmRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingPromptRef = useRef<string>('');
  const startedAtRef = useRef(0);
  const deadlineRef = useRef(0);

  const prompt = prompts[current]!;
  const cap = MAX_SECONDS[prompt.part] ?? 60;
  const promptStatus = status[prompt.id] ?? 'none';

  const setPromptStatus = (id: string, s: Status) =>
    setStatus((prev) => ({ ...prev, [id]: s }));

  /** Move to another prompt, dropping any per-prompt UI. Nav is disabled while
   *  a recording or prep countdown is running, so this never interrupts one. */
  const goTo = (i: number) => {
    setCurrent(Math.max(0, Math.min(prompts.length - 1, i)));
    setPhase('idle');
    setLeft(0);
    setMicError(null);
  };

  const upload = useCallback(
    async (promptId: string, wav: Blob, duration: number) => {
      setPromptStatus(promptId, 'uploading');
      try {
        const fd = new FormData();
        fd.set('attemptId', attemptId);
        fd.set('promptId', promptId);
        fd.set('duration', String(duration));
        fd.set('audio', wav, `${promptId}.wav`);
        const res = await saveSpeakingRecording(fd);
        setPromptStatus(promptId, res.ok ? 'saved' : 'failed');
      } catch {
        setPromptStatus(promptId, 'failed');
      }
    },
    [attemptId],
  );

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;

    const wav = recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setAnalyser(null);
    setPhase('idle');

    const promptId = recordingPromptRef.current;
    const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
    if (wav.size > 44) {
      void upload(promptId, wav, duration);
    } else {
      // A header-only WAV means no samples were captured.
      setPromptStatus(promptId, 'failed');
    }
  }, [upload]);

  const beginRecording = useCallback(async () => {
    setMicError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError(
        'No microphone access. Allow the mic for this site and try again.',
      );
      setPhase('idle');
      return;
    }

    let recorder: PcmRecorder;
    try {
      recorder = startPcmRecording(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setMicError('Could not start recording. Try again.');
      setPhase('idle');
      return;
    }

    recorderRef.current = recorder;
    streamRef.current = stream;
    recordingPromptRef.current = prompt.id;
    setAnalyser(recorder.analyser);

    startedAtRef.current = Date.now();
    deadlineRef.current = Date.now() + cap * 1000;
    setPhase('recording');
    setLeft(cap);
  }, [prompt.id, cap]);

  // One ticker for both countdowns. The deadline lives in a ref, so this effect
  // only ever wires up an interval — the state changes happen in its callback,
  // where a cascading render is not a concern.
  useEffect(() => {
    if (phase === 'idle') return;
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((deadlineRef.current - Date.now()) / 1000),
      );
      setLeft(remaining);

      if (remaining <= 0) {
        clearInterval(id);
        if (phase === 'prep') void beginRecording();
        else stopRecording();
      }
    };
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phase, beginRecording, stopRecording]);

  // Leaving the page mid-recording: release the mic and the audio graph. The
  // in-flight answer is dropped rather than saved half-spoken.
  useEffect(
    () => () => {
      recorderRef.current?.stop();
      recorderRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  const start = () => {
    if (prompt.prepSeconds > 0) {
      deadlineRef.current = Date.now() + prompt.prepSeconds * 1000;
      setLeft(prompt.prepSeconds);
      setPhase('prep');
    } else {
      void beginRecording();
    }
  };

  const savedCount = prompts.filter((p) => status[p.id] === 'saved').length;
  const unsaved = Object.values(status).some(
    (s) => s === 'uploading' || s === 'failed',
  );
  const busy = phase === 'prep' || phase === 'recording';

  return (
    <div className="-m-6 flex h-svh flex-col overflow-hidden sm:-m-10">
      {mock ? <MockBlurBanner /> : null}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p className="min-w-0 truncate font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          <span className="text-foreground">{title}</span> · {savedCount} /{' '}
          {prompts.length} recorded
        </p>
        <SubmitConfirm
          action={submitSpeakingAttempt}
          attemptId={attemptId}
          unanswered={prompts.length - savedCount}
          total={prompts.length}
          unsaved={unsaved}
          disabled={busy}
          label="Finish & submit"
        />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 overflow-y-auto px-6 py-10">
        <div className="space-y-2">
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            {PART_TITLE[prompt.part] ?? `Part ${prompt.part}`}
          </p>
          <h1 className="font-title text-title">{prompt.text}</h1>
        </div>

        {prompt.cueCardPoints?.length ? (
          <div className="border border-border p-4">
            <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
              You should say
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {prompt.cueCardPoints.map((pt) => (
                <li key={pt} className="border-l-2 border-chrome pl-3">
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {prompt.audioUrl ? (
          <div>
            <audio ref={audioRef} src={prompt.audioUrl} className="hidden" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => audioRef.current?.play()}
            >
              <Play className="size-4" /> Hear the examiner
            </Button>
          </div>
        ) : null}

        {/* Recording controls */}
        <div className="space-y-3 border-t border-border pt-6">
          {phase === 'prep' ? (
            <p className="flex items-center gap-2 text-sm">
              <Circle className="size-3 animate-pulse text-chrome" />
              Preparing — recording starts in {mmss(left)}
            </p>
          ) : phase === 'recording' ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 font-mono text-sm text-destructive">
                <Circle className="size-3 animate-pulse fill-destructive" />
                Recording · {mmss(left)} left
              </p>
              <LiveWaveform
                analyser={analyser}
                active={phase === 'recording'}
                height={24}
              />
              <Button type="button" onClick={stopRecording}>
                <Square className="size-4" /> Stop
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={start}>
                <Mic className="size-4" />
                {promptStatus === 'saved' || promptStatus === 'failed'
                  ? 'Record again'
                  : prompt.prepSeconds > 0
                    ? `Prepare (${prompt.prepSeconds}s) & record`
                    : 'Record answer'}
              </Button>
              {promptStatus === 'uploading' ? (
                <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Uploading…
                </span>
              ) : promptStatus === 'saved' ? (
                <span className="font-mono text-xs tracking-widest text-primary uppercase">
                  Saved
                </span>
              ) : promptStatus === 'failed' ? (
                <span
                  role="alert"
                  className="font-mono text-xs tracking-widest text-destructive uppercase"
                >
                  Upload failed — record again
                </span>
              ) : null}
            </div>
          )}

          {micError ? (
            <p role="alert" className="text-sm text-destructive">
              {micError}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            You may speak for up to {mmss(cap)}. Recording stops automatically
            at the limit.
          </p>
        </div>
      </div>

      <ExamNavigator
        kind="step"
        items={prompts.map((p) => ({
          id: p.id,
          label: p.idx,
          answered: (status[p.id] ?? 'none') === 'saved',
          flagged: (status[p.id] ?? 'none') === 'failed',
        }))}
        currentId={prompt.id}
        onJump={(id) => {
          const i = prompts.findIndex((p) => p.id === id);
          if (i !== -1) goTo(i);
        }}
        answeredCount={savedCount}
        total={prompts.length}
        countLabel="recorded"
        disabled={busy}
      >
        <span className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || current === 0}
            onClick={() => goTo(current - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy || current === prompts.length - 1}
            onClick={() => goTo(current + 1)}
          >
            Next
          </Button>
        </span>
      </ExamNavigator>
    </div>
  );
}
