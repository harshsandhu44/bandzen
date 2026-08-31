import {
  Check,
  CircleDashed,
  Lock,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@bandzen/ui/lib/utils';
import {
  MODULE_LABEL,
  UNAVAILABLE_REASON,
  type IELTSModule,
  type SkillLevel,
} from '@/lib/modules';
import type { StudyTaskStatus } from '@/lib/study-plan';

/**
 * Status indicators.
 *
 * Every one of these pairs a glyph and a word with its colour. Colour alone
 * would fail anyone who cannot distinguish these hues -- and on a screen whose
 * whole job is telling a candidate what they got wrong, that is the one place
 * the app cannot afford to be ambiguous.
 */

const SKILL_LEVEL = {
  'needs-work': {
    label: 'Needs work',
    Icon: TriangleAlert,
    className: 'text-destructive',
  },
  improving: { label: 'Improving', Icon: TrendingUp, className: 'text-chrome' },
  strong: { label: 'Strong', Icon: Check, className: 'text-primary' },
} as const satisfies Record<SkillLevel, unknown>;

export function SkillStatus({
  level,
  className,
}: {
  level: SkillLevel;
  className?: string;
}) {
  const { label, Icon, className: tone } = SKILL_LEVEL[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[0.6875rem] tracking-[0.18em] uppercase',
        tone,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/** Accuracy to a level. The thresholds are the plan's, not IELTS's. */
export function toSkillLevel(accuracy: number): SkillLevel {
  if (accuracy >= 0.8) return 'strong';
  if (accuracy >= 0.6) return 'improving';
  return 'needs-work';
}

const TASK_STATUS = {
  completed: { label: 'Done', Icon: Check, className: 'text-primary' },
  active: { label: 'In progress', Icon: TrendingUp, className: 'text-chrome' },
  pending: {
    label: 'To do',
    Icon: CircleDashed,
    className: 'text-muted-foreground',
  },
} as const satisfies Record<StudyTaskStatus, unknown>;

export function TaskStatus({ status }: { status: StudyTaskStatus }) {
  const { label, Icon, className } = TASK_STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ModuleBadge({ module }: { module: IELTSModule }) {
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {MODULE_LABEL[module]}
    </span>
  );
}

/**
 * A module the marketing site promises and the product cannot yet deliver.
 * It says why, in the same words everywhere, rather than showing a zero score
 * or a button that does nothing.
 */
export function LockedModule({ module }: { module: IELTSModule }) {
  return (
    <div className="flex items-start gap-3 border border-dashed border-border px-4 py-3">
      <Lock
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="space-y-0.5">
        <p className="font-title text-sm">{MODULE_LABEL[module]}</p>
        <p className="text-xs text-muted-foreground">
          {UNAVAILABLE_REASON[module] ?? 'Not available yet.'}
        </p>
      </div>
    </div>
  );
}
