'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * A live microphone-level waveform, adapted from ElevenLabs UI
 * (ui.elevenlabs.io) and restyled to bandzen tokens.
 *
 * Takes an existing `AnalyserNode` rather than requesting mic access itself —
 * the caller already owns the stream (and its `MediaRecorder`), so this only
 * draws from it. Runs its own animation loop while `active`; renders a flat
 * idle row otherwise.
 */
export type LiveWaveformProps = HTMLAttributes<HTMLDivElement> & {
  analyser: AnalyserNode | null;
  active?: boolean;
  bars?: number;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  /** CSS color for the bars. Defaults to `--primary` (cobalt). */
  color?: string;
  height?: string | number;
};

export const LiveWaveform = ({
  analyser,
  active = false,
  bars = 24,
  barWidth = 3,
  barGap = 2,
  barRadius = 2,
  color,
  height = 64,
  className,
  ...props
}: LiveWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const ctx = canvas.getContext('2d');
    if (!ctx) return () => resizeObserver.disconnect();
    ctx.scale(dpr, dpr);

    const barColor =
      color || getComputedStyle(canvas).getPropertyValue('--primary') || '#000';
    const step = barWidth + barGap;
    const freqData = new Uint8Array(analyser?.frequencyBinCount ?? 0);
    let rafId: number;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      const centerY = rect.height / 2;

      if (active && analyser) {
        analyser.getByteFrequencyData(freqData);
        // Skip the near-silent low end; voice energy lives past it.
        const start = Math.floor(freqData.length * 0.05);
        const end = Math.floor(freqData.length * 0.4);
        const span = end - start;

        for (let i = 0; i < bars; i++) {
          const dataIndex = start + Math.floor((i / bars) * span);
          const value = Math.max(0.06, (freqData[dataIndex] ?? 0) / 255);
          const barHeight = Math.max(3, value * rect.height * 0.85);
          const x = i * step;
          const y = centerY - barHeight / 2;

          ctx.fillStyle = barColor;
          if (barRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, barRadius);
            ctx.fill();
          } else {
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      }

      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [analyser, active, bars, barWidth, barGap, barRadius, color]);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height: heightStyle }}
      role="img"
      aria-label={active ? 'Live microphone level' : 'Microphone idle'}
      {...props}
    >
      {!active ? (
        <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-t-2 border-dotted border-border" />
      ) : null}
      <canvas className="block h-full w-full" ref={canvasRef} aria-hidden />
    </div>
  );
};
