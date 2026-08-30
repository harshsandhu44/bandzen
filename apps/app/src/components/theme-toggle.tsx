'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@bandzen/ui/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'System', Icon: Monitor },
] as const;

const noopSubscribe = () => () => {};

/**
 * The server cannot know the stored theme, so reading it during render would
 * guarantee a hydration mismatch. useSyncExternalStore gives React an explicit
 * server snapshot (`false`) and client snapshot (`true`) for "are we hydrated
 * yet", which is the same guard as the usual mount-effect without the extra
 * render pass — and without tripping react-hooks/set-state-in-effect.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex border border-border"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = hydrated && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex size-7 items-center justify-center text-muted-foreground transition-colors',
              'hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
              active && 'bg-secondary text-foreground',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
