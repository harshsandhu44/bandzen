import type { ComponentProps } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@bandzen/ui/lib/utils';

function BubbleGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-group"
      className={cn('flex min-w-0 flex-col gap-2', className)}
      {...props}
    />
  );
}

const bubbleVariants = cva(
  'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end',
  {
    variants: {
      variant: {
        default:
          '*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground',
        secondary:
          '*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground',
        muted: '*:data-[slot=bubble-content]:bg-muted',
        tinted:
          '*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)] *:data-[slot=bubble-content]:text-foreground dark:*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.3_calc(c*0.4)_h)]',
        outline:
          '*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background',
        destructive:
          '*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive dark:*:data-[slot=bubble-content]:bg-destructive/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Bubble({
  variant = 'default',
  align = 'start',
  className,
  ...props
}: ComponentProps<'div'> &
  VariantProps<typeof bubbleVariants> & { align?: 'start' | 'end' }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), className)}
      {...props}
    />
  );
}

function BubbleContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="bubble-content"
      className={cn(
        'w-fit max-w-full min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end',
        className,
      )}
      {...props}
    />
  );
}

export { BubbleGroup, Bubble, BubbleContent };
