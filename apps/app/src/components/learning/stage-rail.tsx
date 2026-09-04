'use client';

import { useEffect, useState } from 'react';
import { cn } from '@bandzen/ui/lib/utils';
import { STAGE_TITLE, type LessonStageId } from '@/content/lesson-types';

/**
 * The lesson's six stages as a jump list, with a marker that follows the
 * reader down the page.
 *
 * The only client component in Learn. It enhances a page that is already
 * complete without it: the links are plain `#stage-x` anchors, so navigation
 * works before hydration and the active marker is the only thing JavaScript
 * adds. The jump is the browser default -- instant, no smooth scroll (this is
 * still a study surface).
 *
 * The active stage is the last heading scrolled past a line near the top of
 * the viewport. A plain scroll listener rather than IntersectionObserver: a
 * stage taller than the observer's active band leaves the marker stale, and a
 * six-element measurement on a passive scroll listener costs nothing.
 *
 * The page positions and hides this (`hidden lg:block`, sticky); the component
 * only draws the list.
 */
export function StageRail({ stages }: { stages: readonly LessonStageId[] }) {
  const [active, setActive] = useState<LessonStageId | null>(stages[0] ?? null);

  useEffect(() => {
    const els = stages
      .map((id) => document.getElementById(`stage-${id}`))
      .filter((el): el is HTMLElement => el != null);
    if (!els.length) return;

    const update = () => {
      // At the foot of the page the last stage can't reach the line, so pin it.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(stages[stages.length - 1]!);
        return;
      }
      let current = els[0]!.id;
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 140) current = el.id;
      }
      setActive(current.replace('stage-', '') as LessonStageId);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [stages]);

  return (
    <nav aria-label="Lesson stages">
      <p className="mb-3 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Stages
      </p>
      <ol className="space-y-0.5">
        {stages.map((id, i) => {
          const on = active === id;
          return (
            <li key={id}>
              <a
                href={`#stage-${id}`}
                aria-current={on ? 'true' : undefined}
                className={cn(
                  'flex items-baseline gap-2.5 py-1 text-xs transition-colors',
                  on
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'size-1.5 shrink-0 translate-y-[3px] rounded-full border',
                    on
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/50',
                  )}
                />
                <span
                  className={cn(
                    'font-mono text-[0.625rem] tabular-nums',
                    on && 'text-primary',
                  )}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{STAGE_TITLE[id]}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
