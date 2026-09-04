'use client';

import { useEffect, useRef, type HTMLAttributes } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * A canvas amplitude-bar waveform, adapted from ElevenLabs UI
 * (ui.elevenlabs.io) and restyled to bandzen tokens. Renders `data` (0-1
 * peaks) as bars; `progress` (0-1) splits them into a played/unplayed color.
 *
 * Non-interactive by design — no `onBarClick`/seek handling. The listening
 * runner's audio is deliberately single-play with no scrub bar ("exam
 * realism, deliberate" — see `listening-test.tsx`), and this waveform must
 * not undermine that.
 */
export type WaveformProps = HTMLAttributes<HTMLDivElement> & {
  /** Amplitude peaks, 0-1. Falls back to a flat placeholder pattern if empty. */
  data?: number[];
  /** Fraction (0-1) of bars to render in `playedColor` rather than `color`. */
  progress?: number;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  /** CSS color for the unplayed portion. Defaults to `--border`. */
  color?: string;
  /** CSS color for the played portion. Defaults to `--primary` (cobalt). */
  playedColor?: string;
  height?: string | number;
};

export const Waveform = ({
  data = [],
  progress = 0,
  barWidth = 3,
  barGap = 2,
  barRadius = 2,
  color,
  playedColor,
  height = 64,
  className,
  ...props
}: WaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const style = getComputedStyle(canvas);
      const unplayed = color || style.getPropertyValue('--border') || '#ccc';
      const played =
        playedColor || style.getPropertyValue('--primary') || unplayed;

      const barCount = Math.max(
        1,
        Math.floor(rect.width / (barWidth + barGap)),
      );
      const centerY = rect.height / 2;
      const values = data.length ? data : Array(barCount).fill(0.35);
      const playedBars = Math.round(barCount * progress);

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * values.length);
        const value = values[dataIndex] ?? 0;
        const barHeight = Math.max(3, value * rect.height * 0.85);
        const x = i * (barWidth + barGap);
        const y = centerY - barHeight / 2;

        ctx.fillStyle = i < playedBars ? played : unplayed;
        if (barRadius > 0) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, barRadius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
    };

    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(container);
    render();

    return () => resizeObserver.disconnect();
  }, [data, progress, barWidth, barGap, barRadius, color, playedColor]);

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      style={{ height: heightStyle }}
      {...props}
    >
      <canvas className="block h-full w-full" ref={canvasRef} />
    </div>
  );
};
