import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, SectionHeader } from '@/components/app/primitives';
import { DOCS_URL } from '../nav-links';
import { ThemeToggle } from '@bandzen/ui/components/theme-toggle';
import { Version } from '@bandzen/ui/components/version';
import { requireUserId } from '@/lib/auth';
import { getProfile, getSubscription } from '@/lib/db/queries';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  isProAt,
} from '@/lib/entitlements';
import { ProTag } from '@/components/billing/pro';
import { CancelPlan } from './cancel-plan';
import { SettingsForm } from './settings-form';
import pkg from '../../../../package.json';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Settings' };

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [profile, user, subscription] = await Promise.all([
    getProfile(userId),
    currentUser(),
    getSubscription(userId),
  ]);

  const pro = isProAt(subscription?.currentPeriodEnd);
  const paid = pro && subscription?.razorpaySubscriptionId != null;
  const granted = pro && subscription?.razorpaySubscriptionId == null;

  return (
    <div className="max-w-2xl space-y-10">
      <PageHeader
        eyebrow="Settings"
        title="Your preparation"
        description="Changing any of these recalculates your study plan the next time you open it."
      />

      <SettingsForm
        examType={profile?.examType ?? null}
        targetBand={profile?.targetBand ?? null}
        testDate={profile?.testDate ?? null}
        selfAssessedBand={profile?.selfAssessedBand ?? null}
        studyMinutes={profile?.studyMinutes ?? null}
      />

      <section className="space-y-3 border-t border-border pt-8">
        <SectionHeader as="h2">Plan</SectionHeader>

        <dl className="divide-y divide-border border-y border-border">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Current plan</dt>
            <dd className="flex items-center gap-2 text-sm">
              {pro ? <ProTag /> : 'Free'}
              {granted ? (
                <span className="text-muted-foreground">
                  {subscription?.planId === 'trial' ? 'Trial' : 'Founding'}
                </span>
              ) : null}
            </dd>
          </div>
          {pro && subscription ? (
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">
                {paid ? 'Renews' : 'Runs until'}
              </dt>
              <dd className="text-sm tabular-nums">
                {DATE.format(subscription.currentPeriodEnd)}
              </dd>
            </div>
          ) : null}
        </dl>

        {paid && subscription ? (
          <CancelPlan
            until={DATE.format(subscription.currentPeriodEnd)}
            essaysPerWeek={FREE_ESSAYS_PER_WINDOW}
            coachPerWeek={FREE_COACH_MESSAGES_PER_WINDOW}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/upgrade?from=settings" />}
          >
            {granted ? 'Continue after this ends' : 'See Pro'}
          </Button>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-8">
        <SectionHeader as="h2">Account</SectionHeader>

        <dl className="divide-y divide-border border-y border-border">
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd className="font-mono text-xs">
              {user?.primaryEmailAddress?.emailAddress ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Appearance</dt>
            <dd>
              <ThemeToggle />
            </dd>
          </div>
          {/* Also in the sidebar, but the sidebar does not exist on a phone
              and this is the one screen every breakpoint can reach. */}
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Help</dt>
            <dd>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
              >
                Documentation
              </a>
            </dd>
          </div>
          {/* Here rather than in the shell, because the sidebar this app's
              version would otherwise sit in does not exist on a phone. */}
          <div className="flex items-baseline justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Version</dt>
            <dd>
              <Version value={pkg.version} />
            </dd>
          </div>
        </dl>

        {/* Identity is Clerk's; name, password and email changes belong there
            rather than in a second half-implemented account screen here. */}
        <p className="text-xs text-muted-foreground">
          Your name, email address and password are managed by your Bandzen
          sign-in and are changed there.
        </p>

        <SignOutButton>
          <Button type="button" variant="outline" size="sm">
            Sign out
          </Button>
        </SignOutButton>
      </section>
    </div>
  );
}
