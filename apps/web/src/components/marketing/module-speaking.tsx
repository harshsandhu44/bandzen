import { BandScale } from '@bandzen/ui/components/band-scale';

import { speakingSample } from '@/content/sections';

import { ModulePanel } from './module-panel';
import { Waveform } from './waveform';

export function ModuleSpeaking({ className }: { className?: string }) {
  return (
    <ModulePanel
      className={className}
      name="Speaking"
      insight={speakingSample.insight}
    >
      <div className="flex items-baseline justify-between font-mono text-[0.625rem] tracking-[0.18em] uppercase">
        <span>{speakingSample.part}</span>
        <span className="text-slate flex items-center gap-1.5">
          <span className="bg-destructive size-1.5 rounded-full" />
          Recorded
        </span>
      </div>

      <Waveform className="mt-5 h-12" />

      <p className="text-slate mt-5 text-[0.8125rem] leading-relaxed">
        {speakingSample.transcript.split('…').map((part, i) =>
          i === 0 ? (
            part
          ) : (
            <span key={part}>
              <span className="bg-chrome/40 text-ink px-1">…</span>
              {part}
            </span>
          ),
        )}
      </p>

      <ul className="border-border mt-6 flex flex-col gap-3 border-t pt-5">
        {speakingSample.metrics.map((m) => (
          <li key={m.label}>
            <BandScale variant="row" label={m.label} value={m.value} />
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
