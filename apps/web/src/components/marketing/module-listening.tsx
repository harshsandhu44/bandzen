import { listeningSample } from '@/content/sections';

import { ModulePanel } from './module-panel';
import { Waveform } from './waveform';

export function ModuleListening({ className }: { className?: string }) {
  return (
    <ModulePanel
      className={className}
      name="Listening"
      insight={listeningSample.insight}
    >
      <div className="flex items-baseline justify-between font-mono text-[0.625rem] tracking-[0.18em] uppercase">
        <span>{listeningSample.section}</span>
        <span className="text-slate tabular-nums">
          {listeningSample.duration}
        </span>
      </div>

      <Waveform className="mt-5 h-16" />

      {/* Answer timeline — position on the track, not a list. */}
      <div className="relative mt-6 h-12">
        <div className="bg-border absolute inset-x-0 top-2 h-px" />
        {listeningSample.answers.map((a) => (
          <div
            key={a.n}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${a.at}%` }}
          >
            <span
              className={
                a.ok
                  ? 'bg-cobalt block size-2 rounded-full'
                  : 'border-ink bg-paper block size-2 rounded-full border'
              }
            />
            <span className="text-slate mt-2 block font-mono text-[0.5625rem] tabular-nums">
              {a.n}
            </span>
          </div>
        ))}
      </div>

      <p className="text-slate flex flex-wrap gap-x-4 font-mono text-[0.5625rem] tracking-[0.14em] uppercase">
        <span className="flex items-center gap-1.5">
          <span className="bg-cobalt size-2 rounded-full" /> Correct
        </span>
        <span className="flex items-center gap-1.5">
          <span className="border-ink size-2 rounded-full border" /> Missed
        </span>
      </p>
    </ModulePanel>
  );
}
