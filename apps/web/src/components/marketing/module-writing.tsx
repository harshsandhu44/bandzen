import { writingSample } from '@/content/sections';

import { ModulePanel } from './module-panel';

const TONE = {
  good: 'decoration-cobalt',
  error: 'decoration-destructive',
  weak: 'decoration-chrome',
} as const;

const DOT = {
  good: 'bg-cobalt',
  error: 'bg-destructive',
  weak: 'bg-chrome',
} as const;

export function ModuleWriting({ className }: { className?: string }) {
  return (
    <ModulePanel
      className={className}
      name="Writing"
      insight="Task Response is the criterion holding this response at 6.5."
    >
      <div className="flex items-baseline justify-between font-mono text-[0.625rem] tracking-[0.18em] uppercase">
        <span className="shrink-0">{writingSample.task}</span>
        <span className="text-slate truncate pl-3">{writingSample.prompt}</span>
      </div>

      <p className="mt-5 text-sm leading-loose">
        {writingSample.sentences.map((s) => (
          <span
            key={s.text}
            className={`underline decoration-wavy decoration-2 underline-offset-4 ${TONE[s.tone]}`}
          >
            {s.text}
          </span>
        ))}
      </p>

      <ul className="border-border mt-6 flex flex-col gap-2 border-t pt-5">
        {writingSample.sentences.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2.5 font-mono text-[0.625rem] tracking-[0.14em] uppercase"
          >
            <span className={`size-2 shrink-0 ${DOT[s.tone]}`} />
            {s.label}
          </li>
        ))}
      </ul>
    </ModulePanel>
  );
}
