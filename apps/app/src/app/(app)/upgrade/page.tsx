import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { Check, Clock } from 'lucide-react';
import { Badge } from '@bandzen/ui/components/badge';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import {
  Eyebrow,
  PageHeader,
  SectionHeader,
} from '@/components/app/primitives';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { daysUntil } from '@/lib/dates';
import { getProfile, getSubscription, latestBand } from '@/lib/db/queries';
import { meanBand } from '@/lib/plan-data';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  PLANS,
  formatInr,
  isFoundingActive,
  isProAt,
  perDay,
  perMonth,
  priceOf,
  savingsPercent,
} from '@/lib/entitlements';
import { foundingEndsAt } from '@/lib/razorpay';
import { CheckoutButton } from './checkout-button';

export const metadata = { title: 'Bandzen Pro' };

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
});

/** What Pro removes the ceiling on, in the order a candidate feels them. */
const INCLUDED = [
  'Unlimited essay marking, against all four IELTS criteria',
  'Speaking tests, graded from your audio on all four criteria',
  'Full four-skill mock tests, one a week',
  'Unlimited Bandzen Coach',
  'Retake the diagnostic whenever you want to re-measure',
  'Your full band history, not just the last five attempts',
];

export default async function UpgradePage(props: PageProps<'/upgrade'>) {
  const userId = await requireUserId();
  const searchParams = await props.searchParams;
  const source =
    typeof searchParams.from === 'string' ? searchParams.from : 'direct';

  const [user, profile, subscription, reading, writing, listening, speaking] =
    await Promise.all([
      currentUser(),
      getProfile(userId),
      getSubscription(userId),
      latestBand(userId, 'reading'),
      latestBand(userId, 'writing'),
      latestBand(userId, 'listening'),
      latestBand(userId, 'speaking'),
    ]);

  await capture(userId, 'upgrade_viewed', { source });

  const founding = isFoundingActive(foundingEndsAt());
  const endsAt = foundingEndsAt();
  const hasTimeLeft = isProAt(subscription?.currentPeriodEnd);
  const paying = hasTimeLeft && subscription?.razorpaySubscriptionId != null;

  const days = profile?.testDate
    ? daysUntil(profile.testDate, profile.timezone)
    : null;
  const measured = meanBand(reading, writing, listening, speaking);
  const gap =
    profile?.targetBand != null && measured != null
      ? profile.targetBand - measured
      : null;

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        eyebrow="Bandzen Pro"
        title={paying ? 'You are on Pro' : 'Practise as much as you need to'}
        description={
          paying
            ? 'Everything is unlimited. Manage or cancel your plan from Settings.'
            : `Free covers ${FREE_ESSAYS_PER_WINDOW} marked essays and ${FREE_COACH_MESSAGES_PER_WINDOW} Coach messages a week. Pro removes the ceiling on both.`
        }
      />

      {/* Their own situation, in their own numbers. Nothing here is invented:
          every line is a row this candidate already has, or it is not shown. */}
      {!paying && (days != null || gap != null) ? (
        <section className="border-l-2 border-chrome bg-secondary/30 px-5 py-4">
          <dl className="space-y-1 text-sm">
            {days != null && days >= 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">Your test</dt>
                <dd className="tabular-nums">
                  {days === 0 ? 'Today' : `${days} days away`}
                  {days > 0 && days <= 90 ? (
                    <>
                      {' · '}
                      {days <= 31
                        ? 'one month covers it'
                        : 'the 3-month plan covers it'}
                    </>
                  ) : null}
                </dd>
              </div>
            ) : null}
            {gap != null && gap > 0 ? (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">To your target</dt>
                <dd className="tabular-nums">
                  {measured!.toFixed(1)} → {profile!.targetBand!.toFixed(1)} ·{' '}
                  {gap.toFixed(1)} of a band
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : null}

      {paying ? (
        <section className="space-y-3">
          <SectionHeader as="h2">Your plan</SectionHeader>
          <dl className="divide-y divide-border border-y border-border text-sm">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-muted-foreground">Renews</dt>
              <dd className="tabular-nums">
                {DATE.format(subscription!.currentPeriodEnd)}
              </dd>
            </div>
          </dl>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/settings" />}
          >
            Manage in Settings
          </Button>
        </section>
      ) : (
        <section aria-labelledby="plans" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <SectionHeader as="h2">
              <span id="plans">Choose a plan</span>
            </SectionHeader>
            {founding && endsAt ? (
              <Eyebrow className="text-chrome">
                Founding price until {DATE.format(endsAt)}
              </Eyebrow>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {PLANS.map((plan) => {
              const saving = savingsPercent(plan, founding);
              return (
                <div
                  key={plan.key}
                  className={cn(
                    'flex flex-col justify-between gap-5 border p-5',
                    plan.featured ? 'border-chrome' : 'border-border',
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <Eyebrow>{plan.label}</Eyebrow>
                      {saving > 0 ? (
                        <Badge variant="secondary">Save {saving}%</Badge>
                      ) : null}
                    </div>

                    <p className="font-metric text-metric">
                      {formatInr(priceOf(plan, founding))}
                    </p>

                    <p className="text-xs text-muted-foreground tabular-nums">
                      {plan.months === 1
                        ? `${perDay(plan, founding)} a day`
                        : `${formatInr(perMonth(plan, founding))} a month · billed once`}
                    </p>

                    {founding ? (
                      <p className="text-xs text-muted-foreground">
                        Rises to {formatInr(plan.standard)} after the founding
                        window. You keep this price while you stay subscribed.
                      </p>
                    ) : null}
                  </div>

                  <CheckoutButton
                    planKey={plan.key}
                    source={source}
                    label={`Choose ${plan.label.toLowerCase()}`}
                    variant={plan.featured ? 'default' : 'outline'}
                    email={user?.primaryEmailAddress?.emailAddress}
                    name={user?.firstName}
                  />
                </div>
              );
            })}
          </div>

          {hasTimeLeft && subscription ? (
            <p className="flex items-start gap-2 text-xs text-muted-foreground text-pretty">
              <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              You already have Pro until{' '}
              {DATE.format(subscription.currentPeriodEnd)}. Billing starts then
              — you will not pay twice for the same days.
            </p>
          ) : null}
        </section>
      )}

      <section aria-labelledby="included" className="space-y-3">
        <SectionHeader as="h2">
          <span id="included">What Pro includes</span>
        </SectionHeader>
        <ul className="divide-y divide-border border-y border-border">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3 py-3 text-sm">
              <Check
                className="mt-0.5 size-4 shrink-0 text-chrome"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-dashed border-border px-5 py-4">
        <p className="text-sm">Cancel any time. Refund within 7 days.</p>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Cancelling keeps Pro until the end of the period you have paid for.
          Within seven days of a charge we refund it in full, no questions — one
          message is enough.
        </p>
      </section>
    </div>
  );
}
