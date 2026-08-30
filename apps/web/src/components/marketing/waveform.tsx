import { cn } from '@bandzen/ui/lib/utils';

// Fixed, not random — a random array would differ between server and client
// and trip a hydration mismatch.
const BARS = [
  18, 34, 52, 41, 68, 84, 61, 45, 72, 93, 77, 54, 38, 62, 88, 71, 49, 33, 57,
  80, 96, 74, 58, 42, 66, 85, 63, 47, 30, 55, 79, 91, 68, 50, 36, 60, 83, 70,
  46, 28,
] as const;

/** Static audio waveform. Pure CSS bars — no canvas, no audio library. */
export function Waveform({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('flex w-full items-center gap-[2px]', className)}
    >
      {BARS.map((h, i) => (
        <span
          key={i}
          className={cn(
            'flex-1 rounded-full',
            i < BARS.length * 0.45 ? 'bg-cobalt' : 'bg-border',
          )}
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}
