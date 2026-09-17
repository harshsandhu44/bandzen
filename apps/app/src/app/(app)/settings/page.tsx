import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@bandzen/ui/components/tabs';
import { ThemeToggle } from '@bandzen/ui/components/theme-toggle';
import { CookieSettingsButton } from '@bandzen/ui/components/consent';
import { Version } from '@bandzen/ui/components/version';
import { PageHeader } from '@/components/app/primitives';
import { PreparationForm } from '@/components/app/preparation-form';
import { DOCS_URL } from '../nav-links';
import { currentUser, requireUserId } from '@/lib/auth';
import { signOut } from '@/app/(auth)/actions';
import { EXAM_KEYS } from '@bandzen/exams/registry';
import {
  examHasContent,
  getProfile,
  getSubscription,
  listEnrollments,
} from '@/lib/db/queries';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  isProAt,
} from '@/lib/entitlements';
import { ProTag } from '@/components/billing/pro';
import { manageBilling } from '../upgrade/actions';
import { CancelPlan } from './cancel-plan';
import { saveSettings } from './actions';
import pkg from '../../../../package.json';

export const metadata = { title: 'Settings' };

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [profile, user, subscription, enrollments, has] = await Promise.all([
    getProfile(userId),
    currentUser(),
    getSubscription(userId),
    listEnrollments(userId),
    Promise.all(EXAM_KEYS.map((k) => examHasContent(k))),
  ]);

  const pro = isProAt(subscription?.currentPeriodEnd);
  const paid = pro && subscription?.polarSubscriptionId != null;
  const granted = pro && subscription?.polarSubscriptionId == null;
  // Anyone who has ever paid keeps a way to their invoices, including after
  // the subscription ends. Gating the portal on `paid` would mean the people
  // most likely to want a receipt are the ones who cannot get one.
  const billed = subscription?.polarSubscriptionId != null;

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader eyebrow="Settings" title="Settings" />

      <Tabs defaultValue="preparation">
        <TabsList variant="line" className="mb-6">
          <TabsTrigger value="preparation">Preparation</TabsTrigger>
          <TabsTrigger value="plan">Plan &amp; billing</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="preparation" className="space-y-4">
          <p className="text-sm text-muted-foreground text-pretty">
            Changing any of these recalculates your study plan the next time you
            open it.
          </p>
          <PreparationForm
            mode="settings"
            action={saveSettings}
            submitLabel="Save changes"
            enrollments={enrollments}
            withContent={EXAM_KEYS.filter((_, i) => has[i])}
            defaults={{
              examKey: profile?.examKey ?? null,
              examVariant: profile?.examVariant ?? null,
              targetScore: profile?.targetScore ?? null,
              testDate: profile?.testDate ?? null,
              selfAssessedScore: profile?.selfAssessedScore ?? null,
              studyMinutes: profile?.studyMinutes ?? null,
              studyDays: profile?.studyDays ?? null,
            }}
          />
        </TabsContent>

        <TabsContent value="plan" className="space-y-3">
          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Current plan</dt>
              <dd className="flex items-center gap-2 text-sm">
                {pro ? <ProTag /> : 'Free'}
                {granted ? (
                  <span className="text-muted-foreground">Founding</span>
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

          {/* One row, three states. Cancelling is ours because the dialog is
              where someone finds out what they actually lose; invoices are
              Polar's because it is the Merchant of Record and the receipt is
              legally its to issue. Both are buttons rather than a button and a
              paragraph — this panel sits above the fold and prose here pushes
              everything under it down. */}
          <div className="flex flex-wrap items-center gap-2">
            {paid && subscription ? (
              <CancelPlan
                until={DATE.format(subscription.currentPeriodEnd)}
                essaysPerWeek={FREE_ESSAYS_PER_WINDOW}
                coachPerWeek={FREE_COACH_MESSAGES_PER_WINDOW}
              />
            ) : null}
            {billed ? (
              <form action={manageBilling}>
                <Button variant="outline" size="sm" type="submit">
                  Invoices
                </Button>
              </form>
            ) : null}
            {pro ? null : (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/upgrade?from=settings" />}
              >
                See Pro
              </Button>
            )}
            {granted ? (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/upgrade?from=settings" />}
              >
                Continue after this ends
              </Button>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-3">
          <dl className="divide-y divide-border border-y border-border">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-mono text-xs">{user?.email ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Appearance</dt>
              <dd>
                <ThemeToggle />
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Cookies</dt>
              <dd>
                <CookieSettingsButton className="text-sm decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                  Manage
                </CookieSettingsButton>
              </dd>
            </div>
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
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Version</dt>
              <dd>
                <Version value={pkg.version} />
              </dd>
            </div>
          </dl>

          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
