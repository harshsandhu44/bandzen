'use client';

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from 'react';
import { useIsMobile } from '@bandzen/ui/hooks/use-mobile';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@bandzen/ui/components/resizable';
import { SaveStatus } from '@/components/app/save-status';
import { SubmitConfirm } from '@/components/app/submit-confirm';
import { Timer } from '@/components/app/timer';
import { ExamNavigator, type NavItem } from '@/components/exam/exam-navigator';
import type { AutosaveStatus } from '@/lib/use-autosave';

const noopSubscribe = () => () => {};

/**
 * The exam chrome every task-based runner shares, whatever the exam: a header
 * with the answered count, save status and clock; the stimulus and the
 * response side by side (resizable, ratio persisted) or stacked on a phone;
 * the question navigator with submit pinned to the bottom. Knows nothing about
 * what is inside either pane.
 */
export function TaskShell({
  attemptId,
  splitId,
  left,
  right,
  leftRef,
  answered,
  total,
  status,
  onRetry,
  timer,
  beforeSubmit,
  navItems,
  currentId,
  locked = false,
  onJump,
  step,
  submitAction,
}: {
  attemptId: string;
  /** localStorage key suffix for the divider position. */
  splitId: string;
  left: ReactNode;
  right: ReactNode;
  /** The stimulus pane's scroller, for a caller that resets it between sections. */
  leftRef?: RefObject<HTMLDivElement | null>;
  answered: number;
  total: number;
  status: AutosaveStatus;
  onRetry: () => void;
  timer?: { startedAt: string; minutes: number; autoSubmit: boolean };
  /** Awaited before a clock-driven submit, so pending saves land first. */
  beforeSubmit?: () => Promise<void>;
  navItems: NavItem[];
  currentId?: string;
  /** A mock: the navigator shows progress but cannot be used to jump. */
  locked?: boolean;
  onJump: (id: string) => void;
  /** Shown instead of submit while there are items still to come. */
  step?: ReactNode;
  submitAction: (formData: FormData) => void;
}) {
  const isMobile = useIsMobile();
  const splitKey = `runner-split-${splitId}`;
  // The saved divider only exists in the browser. Reading it during the first
  // render made the server's panel styles disagree with the client's, and React
  // keeps the server's on a mismatch — which could collapse a pane to zero
  // width. So hydrate with the default split, then remount the group once with
  // the saved one.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const splitLayout = useMemo(() => {
    if (!hydrated) return undefined;
    try {
      const raw = window.localStorage.getItem(splitKey);
      return raw ? (JSON.parse(raw) as Record<string, number>) : undefined;
    } catch {
      return undefined;
    }
  }, [hydrated, splitKey]);
  const [timeUp, setTimeUp] = useState(false);
  const autoFormRef = useRef<HTMLFormElement>(null);

  return (
    <div className="-m-6 flex min-h-svh flex-col sm:-m-10 lg:h-svh lg:min-h-0">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-6 py-3">
        <p className="font-metric text-metric-sm text-muted-foreground">
          {answered}/{total} answered
        </p>
        <div className="flex items-center gap-4">
          <SaveStatus status={status} onRetry={onRetry} />
          {timer ? (
            <Timer
              startedAt={timer.startedAt}
              minutes={timer.minutes}
              onExpire={() => {
                setTimeUp(true);
                if (!timer.autoSubmit) return;
                void (beforeSubmit?.() ?? Promise.resolve())
                  .catch(() => {})
                  .then(() => autoFormRef.current?.requestSubmit());
              }}
            />
          ) : null}
        </div>
      </header>

      {timeUp && !timer?.autoSubmit ? (
        <p
          role="alert"
          className="shrink-0 border-b border-chrome bg-secondary/40 px-6 py-2 text-sm"
        >
          Time is up. In the real exam this attempt would end now — submit when
          you are ready.
        </p>
      ) : null}

      {isMobile ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            ref={leftRef}
            className="max-h-[42svh] shrink-0 overflow-y-auto border-b border-border p-6"
          >
            {left}
          </div>
          <div className="flex-1 overflow-y-auto">{right}</div>
        </div>
      ) : (
        <ResizablePanelGroup
          key={hydrated ? 'saved' : 'default'}
          id={`runner-${splitId}`}
          className="min-h-0 flex-1 overflow-hidden"
          defaultLayout={splitLayout}
          onLayoutChanged={(l) => {
            try {
              window.localStorage.setItem(splitKey, JSON.stringify(l));
            } catch {
              // A private window that refuses storage is not worth failing over.
            }
          }}
        >
          <ResizablePanel id="left" defaultSize="55" minSize="30">
            <div ref={leftRef} className="h-full overflow-y-auto p-6">
              {left}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="right" minSize="30">
            <div className="h-full overflow-y-auto">{right}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}

      <ExamNavigator
        items={navItems}
        currentId={currentId}
        onJump={onJump}
        disabled={locked}
        answeredCount={answered}
        total={total}
      >
        {step ?? (
          <SubmitConfirm
            action={submitAction}
            attemptId={attemptId}
            unanswered={total - answered}
            total={total}
            unsaved={status === 'failed'}
          />
        )}
      </ExamNavigator>

      <form ref={autoFormRef} action={submitAction} className="hidden">
        <input type="hidden" name="attemptId" value={attemptId} />
      </form>
    </div>
  );
}
