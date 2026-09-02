import { cn } from '@bandzen/ui/lib/utils';

/**
 * The 0–9 band ruler, as a rule.
 *
 * It is the product's one recurring shape — the logo puts a tick under band 9,
 * the OG image draws the whole scale, `band-scale.tsx` is the entire
 * data-visualisation surface — and drawn at page width it makes a documentation
 * site about IELTS look like one at a glance, without a hero image.
 *
 * Presentational and decorative, so `aria-hidden`: the scale it depicts is
 * stated in words on /reference/band-scale, where a screen reader can read it.
 */
export function Ruler({
  mark = 9,
  className,
}: {
  /** Which band carries the chrome tick. */
  mark?: number;
  className?: string;
}) {
  return (
    <div aria-hidden className={cn('flex w-full gap-px', className)}>
      {Array.from({ length: 10 }, (_, band) => (
        <span
          key={band}
          className={cn(
            'h-1 flex-1',
            band === mark ? 'bg-chrome' : 'bg-border',
          )}
        />
      ))}
    </div>
  );
}
