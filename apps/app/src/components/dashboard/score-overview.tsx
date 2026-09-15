import { BandScale, type ScaleSpec } from '@bandzen/ui/components/band-scale';
import { Panel } from '@/components/app/primitives';
import { LockedModule } from '@/components/app/status';
import { MODULE_LABEL, isAvailable } from '@/lib/modules';
import type { Skill } from '@/lib/db/schema';

/**
 * Where the candidate stands, module by module.
 *
 * A module with no engine behind it says so instead of showing a zero. A zero
 * would be a measurement, and we have not measured anything.
 */
export function ScoreOverview({
  scores,
  target,
  scale,
  skills,
}: {
  /** The skills the active exam measures, in its order. */
  skills: readonly Skill[];
  scores: Partial<Record<Skill, number | null>>;
  target?: number | null;
  scale: ScaleSpec;
}) {
  return (
    <Panel title="By module" headingId="bands-heading">
      <div className="space-y-3">
        {skills.map((module) => {
          if (!isAvailable(module)) {
            return <LockedModule key={module} module={module} />;
          }

          const value = scores[module];
          if (value == null) {
            return (
              <div
                key={module}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-3"
              >
                <p className="text-sm">{MODULE_LABEL[module]}</p>
                <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Not measured
                </p>
              </div>
            );
          }

          return (
            <BandScale
              key={module}
              value={value}
              target={target ?? undefined}
              label={MODULE_LABEL[module]}
              scale={scale}
            />
          );
        })}
      </div>
    </Panel>
  );
}
