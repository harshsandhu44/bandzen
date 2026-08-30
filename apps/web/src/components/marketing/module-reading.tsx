import { readingSample } from '@/content/sections';

import { ModulePanel } from './module-panel';

export function ModuleReading({ className }: { className?: string }) {
  return (
    <ModulePanel
      className={className}
      name="Reading"
      insight={readingSample.insight}
    >
      <p className="text-slate font-mono text-[0.625rem] tracking-[0.18em] uppercase">
        Q14 · True / False / Not Given
      </p>
      <p className="mt-3 text-sm leading-snug">{readingSample.question}</p>

      <div className="border-border mt-5 flex flex-col gap-3 border-t pt-5">
        {readingSample.paragraphs.map((p) => (
          <p key={p.ref} className="text-[0.8125rem] leading-relaxed">
            <span className="text-slate mr-2 font-mono text-[0.625rem]">
              {p.ref}
            </span>
            {p.text}
            {p.highlight && (
              <mark className="bg-chrome text-ink box-decoration-clone px-0.5">
                {p.highlight}
              </mark>
            )}
          </p>
        ))}
      </div>

      <p className="border-border mt-5 border-t pt-4 font-mono text-xs tracking-[0.14em] uppercase">
        <span className="text-slate">Answer </span>
        <span className="text-cobalt font-medium">{readingSample.answer}</span>
      </p>
    </ModulePanel>
  );
}
