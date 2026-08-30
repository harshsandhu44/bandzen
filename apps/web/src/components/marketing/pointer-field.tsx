'use client';

import {
  LazyMotion,
  domAnimation,
  useMotionValueEvent,
  useSpring,
} from 'motion/react';
import { useRef, type ReactNode } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

const SPRING = { stiffness: 120, damping: 20, mass: 0.6 };

/**
 * Writes a spring-smoothed pointer position to `--bz-px` / `--bz-py` (each
 * roughly -1 to 1) on its own element. Layers inside read those vars in plain
 * CSS, which keeps every child server-rendered — only the spring is client
 * work, and only on devices with a real pointer.
 */
function Field({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  useMotionValueEvent(x, 'change', (v) =>
    ref.current?.style.setProperty('--bz-px', String(v)),
  );
  useMotionValueEvent(y, 'change', (v) =>
    ref.current?.style.setProperty('--bz-py', String(v)),
  );

  return (
    <div
      ref={ref}
      className={cn('[--bz-px:0] [--bz-py:0]', className)}
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
          return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </div>
  );
}

export function PointerField({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <LazyMotion features={domAnimation} strict>
      <Field className={className}>{children}</Field>
    </LazyMotion>
  );
}
