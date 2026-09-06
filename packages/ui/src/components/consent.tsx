'use client';

import * as React from 'react';

import { cn } from '@bandzen/ui/lib/utils';
import { Button } from '@bandzen/ui/components/button';
import { Checkbox } from '@bandzen/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bandzen/ui/components/dialog';
import {
  CONSENT_ALL,
  CONSENT_NONE,
  type ConsentCategory,
  type ConsentState,
  readConsentCookie,
  serializeConsent,
} from '@bandzen/ui/lib/consent';

const OPEN_PREFERENCES_EVENT = 'bz:open-cookie-preferences';

type ConsentContextValue = {
  /** `null` until hydrated, then `null` only if the visitor hasn't chosen. */
  consent: ConsentState | null;
  setConsent: (next: ConsentState) => void;
  /** `false` on the server and the first client render. */
  hydrated: boolean;
};

const ConsentContext = React.createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [cookieState, setCookieState] = React.useState<ConsentState | null>(
    readConsentCookie,
  );

  // `false` during SSR and the first client render, `true` after. Gating the
  // exposed `consent` on it means the server and first-render trees always see
  // `null` — no hydration mismatch — while an already-decided visitor's real
  // choice lands on the second render, before paint.
  const hydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const consent = hydrated ? cookieState : null;

  const setConsent = React.useCallback((next: ConsentState) => {
    document.cookie = serializeConsent(next);
    setCookieState(next);
  }, []);

  const value = React.useMemo(
    () => ({ consent, setConsent, hydrated }),
    [consent, setConsent, hydrated],
  );

  return <ConsentContext value={value}>{children}</ConsentContext>;
}

export function useConsent() {
  const ctx = React.useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used inside <ConsentProvider>');
  }
  return {
    analytics: ctx.consent?.analytics ?? false,
    marketing: ctx.consent?.marketing ?? false,
    decided: ctx.consent !== null,
    setConsent: ctx.setConsent,
    openPreferences,
  };
}

/**
 * Renders `children` only once the visitor has opted into that category, and
 * only after hydration (the context's `consent` is `null` until then, so the
 * server and first client render always agree).
 *
 * This is the seam for GA4 and the Meta Pixel — wrap their `next/script` tags
 * in `<ConsentGate category="analytics">` / `"marketing"`. Nothing wires them
 * yet; PostHog-JS gates itself directly via `useConsent()` because it needs an
 * effect, not a script tag.
 */
export function ConsentGate({
  category,
  children,
}: {
  category: ConsentCategory;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(ConsentContext);
  if (ctx?.consent?.[category]) return <>{children}</>;
  return null;
}

/** Opens the preferences dialog from anywhere, provider or not. */
export function openPreferences() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
  }
}

/** A plain link/button that reopens the preferences dialog (footer, settings). */
export function CookieSettingsButton({
  className,
  children = 'Cookie settings',
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={openPreferences}
      className={cn(
        'underline decoration-current/40 underline-offset-4 transition-colors hover:decoration-current',
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * The bottom banner plus the preferences dialog. Mount once, high in the tree.
 *
 * The banner is non-blocking: the page stays usable and no choice means nothing
 * non-essential loads (`<ConsentGate>` renders nothing while `consent` is null).
 * No entrance animation — this codebase animates almost nothing.
 */
export function CookieConsent({
  policyHref = '/cookies',
}: {
  policyHref?: string;
}) {
  const ctx = React.useContext(ConsentContext);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ConsentState>(CONSENT_NONE);

  React.useEffect(() => {
    const open = () => {
      setDraft(ctx?.consent ?? CONSENT_NONE);
      setDialogOpen(true);
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, open);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, open);
  }, [ctx?.consent]);

  if (!ctx) return null;
  const { consent, setConsent, hydrated } = ctx;
  const bannerVisible = hydrated && consent === null && !dialogOpen;

  return (
    <>
      {bannerVisible ? (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-popover text-popover-foreground ring-1 ring-foreground/10"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-xs/relaxed text-muted-foreground text-pretty">
              We use necessary cookies to run Bandzen, and optional cookies for
              analytics and marketing.{' '}
              <a
                href={policyHref}
                className="underline underline-offset-3 hover:text-foreground"
              >
                Cookie policy
              </a>
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraft(CONSENT_NONE);
                  setDialogOpen(true);
                }}
              >
                Preferences
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConsent(CONSENT_NONE)}
              >
                Reject all
              </Button>
              <Button size="sm" onClick={() => setConsent(CONSENT_ALL)}>
                Accept all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cookie preferences</DialogTitle>
            <DialogDescription>
              Necessary cookies are always on. Choose what else Bandzen may use.{' '}
              <a href={policyHref}>Cookie policy</a>
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border border-y border-border">
            <CategoryRow
              title="Necessary"
              description="Sign-in, security and remembering these choices. Always on."
              checked
              disabled
            />
            <CategoryRow
              title="Analytics"
              description="Anonymous product usage so we can tell what works. Google Analytics, PostHog."
              checked={draft.analytics}
              onChange={(v) => setDraft((d) => ({ ...d, analytics: v }))}
            />
            <CategoryRow
              title="Marketing"
              description="Measuring ad campaigns. Meta Pixel."
              checked={draft.marketing}
              onChange={(v) => setDraft((d) => ({ ...d, marketing: v }))}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConsent(draft);
                setDialogOpen(false);
              }}
            >
              Save choices
            </Button>
            <Button
              onClick={() => {
                setConsent(CONSENT_ALL);
                setDialogOpen(false);
              }}
            >
              Accept all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 py-3">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange?.(value === true)}
        className="mt-0.5"
      />
      <span className="space-y-0.5">
        <span className="block text-xs font-medium text-foreground">
          {title}
        </span>
        <span className="block text-xs/relaxed text-muted-foreground text-pretty">
          {description}
        </span>
      </span>
    </label>
  );
}
