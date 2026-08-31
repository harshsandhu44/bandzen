# Pricing, tiers and access

The build spec for turning the closed beta into a paid product. Every decision
here was made deliberately; where an obvious alternative was rejected, the
reason is recorded, because the reason is the part that goes stale last.

Nothing in this document is built yet. `apps/app/README.md` still says "Closed
beta, so there is no billing and no quota logic" — that sentence is what this
spec replaces, and it should be rewritten in the same commit that lands the
`subscriptions` table.

## Payments

| Decision       | Answer                                                            |
| -------------- | ----------------------------------------------------------------- |
| Currency       | INR only, India-first                                             |
| Plans          | Monthly + 3-month, quarterly featured                             |
| Founding price | ₹599 / month · ₹1,499 / 3 months                                  |
| Standard price | ₹799 / month · ₹1,999 / 3 months                                  |
| Processor      | Razorpay Subscriptions (UPI Autopay, e-mandate cards, netbanking) |
| Checkout       | Hosted subscription link — server redirect, no client JavaScript  |
| Refunds        | 7 days, no questions. Cancel anytime                              |

**INR only** is a constraint, not an oversight. Razorpay is INR-first;
international card acceptance is a separate activation and recurring
international payments are restricted on most accounts. Pricing in ₹ also buys
UPI Autopay, which is the highest-converting recurring rail available in India.
Candidates outside India cannot buy yet. That is a deliberate limit to revisit
with data, not a bug to discover later.

**Two plans, not one and not three.** A lone price has nothing to be compared
against, so quarterly exists as a real anchor — and it is an honest one, because
`profiles.test_date` says most candidates are preparing over exactly that
horizon. An annual plan was rejected: nobody prepares for IELTS for twelve
months, so it would exist only to make the middle option look cheap.

`apps/web/src/content/sections.ts` currently prices in `$` with a placeholder
badge. Both go when payments flip on.

### Checkout, and the decision that did not survive the API

The plan was a hosted payment link and no client JavaScript. It does not work:
`POST /v1/subscriptions` accepts only `plan_id`, `total_count`, `quantity`,
`start_at`, `expire_by`, `customer_notify`, `addons`, `offer_id` and `notes` —
there is **no `callback_url`**. A hosted `short_url` therefore cannot return
anyone here with a signature; they finish on Razorpay's own success page.

So checkout is Checkout.js with `subscription_id`, and its `handler` callback
hands the three returned ids to a **server action** rather than to a
`callback_url`. That is what keeps the Razorpay webhook the only new route
handler. The cost is one client component and a CDN script tag, loaded on first
press rather than on page load.

Attribution still rides in `notes: { userId }`, so it never depends on the
browser coming back.

### Activation happens twice, on purpose

The moment after payment is the highest-expectation moment in the product, and
Razorpay hands it back unfinished — the webhook may take two seconds or two
minutes.

So both paths activate:

- **The return.** Razorpay's callback carries `razorpay_payment_id`,
  `razorpay_subscription_id` and `razorpay_signature` — an HMAC verified
  server-side with the key secret, so it cannot be forged. Activate on the spot
  and the user lands on a Pro dashboard with no wait.
- **The webhook.** Runs regardless, so someone who closes the tab at Razorpay is
  activated anyway, and renewals and failures have a home.

Both call one idempotent `activateSubscription()`. Neither is optional.

### Webhook safety

Razorpay delivers at-least-once and does not guarantee ordering. A delayed
`subscription.charged` arriving after a newer one would silently downgrade a
paying user — the worst bug available in this system and the hardest to
reproduce afterwards.

Two properties prevent it, and neither needs a table:

```sql
ON CONFLICT (user_id) DO UPDATE SET
  current_period_end = GREATEST(
    subscriptions.current_period_end,
    EXCLUDED.current_period_end),
  status  = EXCLUDED.status,
  plan_id = EXCLUDED.plan_id
```

The upsert is keyed on `user_id`, so a replay is a no-op by construction —
duplicates need no tracking. `GREATEST` means the period end never moves
backwards, so a stale event is ignored. Cancellation is the one deliberate
exception and sets the date explicitly.

A `processed_events` log is worth adding the first time a payment dispute needs
auditing. It is not worth adding before that: it grows without bound, needs a
pruning job, and does not solve ordering on its own.

## Entitlement

```ts
isPro = current_period_end > now();
```

One column comparison. No status matrix, no cron, no downgrade job — access
expires by arithmetic.

Everything falls out of it. Cancelling with `cancel_at_cycle_end` means they
keep the period they paid for, at zero code. A failed renewal simply never
extends the date, so Razorpay's retry window becomes a grace period for free. A
comped account is a row with a future date and no Razorpay id, so founding
members and trials need no special case anywhere.

`status` is stored, but only to render a banner ("renewal failed — update
payment") and to debug. It is never consulted for access. A refund is the one
case that needs a manual write.

## What Free and Pro contain

```
                        FREE                    PRO
Reading practice        unlimited               unlimited
Lessons, resources      unlimited               unlimited
Diagnostic              1, off-quota            unlimited
Essay marking           2 / rolling 7 days      unlimited
Bandzen Coach           10 msgs / rolling 7d    unlimited
Band trend              last 5 attempts         full history
Skill matrix            ✓                       ✓
Patterns                ✓                       ✓
```

The split follows cost, not perceived value:

| Surface           | Marginal cost                          |
| ----------------- | -------------------------------------- |
| Reading practice  | **zero** — `grading.ts` is pure        |
| Lessons/resources | **zero** — authored TypeScript         |
| Essay submit      | one OpenAI call (`gradeEssay`)         |
| Coach message     | one streamed OpenAI call, full context |

Reading is unlimited on Free because it costs nothing to serve and it is what
builds the daily habit that makes someone worth converting. Capping it would
throttle the exact behaviour that produces a paying customer, to save money that
was never being spent.

The skill matrix and patterns list stay free for the same reason: they are what
tell a free user which question type is costing them marks. Gate them and free
practice becomes aimless drilling, which produces neither results nor a reason
to pay. `PRO` on Progress is history depth only — a gate that strengthens by
itself, since a new user loses nothing and the longer someone practises the more
sits behind the fade.

### The rolling window

Seven days, rolling — one query per check, no reset job, no stored anchor:

```
module = 'writing' AND kind <> 'diagnostic' AND status <> 'failed'
AND started_at > now() - interval '7 days'
```

**Started, not submitted.** The mark is charged when the attempt is created, so
counting completions would let someone open unlimited attempts before any of
them finished — and every one of those still costs a grading call. `failed` is
excluded because a model or infrastructure failure is ours, not theirs, and a
diagnostic's writing half is excluded because the first diagnostic is free and
off-quota.

Rolling was chosen over a calendar month because a user who exhausts a monthly
allowance on the 3rd has twenty-seven dead days, which is long enough to forget
the product rather than long enough to force a decision. Rolling also lets the
UI say exactly when the next one frees up — "Next free essay mark unlocks
Thursday" — which is both honest and a scheduled reason to return.

### Essays charge at the start

`startWritingAttempt` blocks; `submitEssay` never does. Once an attempt exists it
is always graded.

Charging at submit would land the ask at peak sunk cost, which is precisely why
it is rejected: it takes forty minutes of a candidate's finite preparation time
and holds the result hostage. `apps/app/README.md` calls losing a candidate's
work "the worst thing this app can do", and this is one step from it.

Resuming is free — `findInProgress` already redirects to the existing attempt
before creating a row, so a resumed essay never costs a second mark.

### The diagnostic is off-quota

The first diagnostic costs nothing from the allowance. It is the demonstration,
`apps/web`'s secondary CTA points straight at it, and charging for it would blunt
the moment the product proves itself.

Repeats are Pro. That is a genuine pull rather than a manufactured one: a
candidate three weeks from their test wants to know whether they have moved, and
that is worth paying for at exactly the moment it matters most.

### Grants

Both are the same mechanism — a row with a future date and no Razorpay id.

- **Existing beta users → 90 days, "Founding member".** They tested a half-built
  product for free; metering them on launch day is a takeaway, and loss aversion
  works hard against you when you remove something people already use. Ninety
  days keeps the goodwill and still ends, so the conversion signal survives.
- **New users → 7 days on completing onboarding.** A reverse trial: Pro first,
  then a fall back to Free — not to nothing. They give something up rather than
  buying something new, which is the stronger motion. Gated on onboarding
  completion rather than signup so OpenAI is only spent on someone who has told
  us their target band and test date.

Day 6 needs an in-app notice that the trial is ending. There is no email
infrastructure in this app — Clerk sends auth mail only.

## The restriction UI

Three states, three marks, never confused with each other:

| State     | Mark                               | CTA       |
| --------- | ---------------------------------- | --------- |
| Unbuilt   | `Lock` icon, dashed border, muted  | **never** |
| Pro-gated | `[PRO]` tag in `--chrome`, no lock | always    |
| Used up   | spent meter + reset date           | always    |

The app already uses `Lock` for things that do not exist — `practice/page.tsx`
and the four-skill mock block, with a verbatim reason from `UNAVAILABLE_REASON`.
Reusing it for paywalls would make both illegible: a candidate could not tell
"pay ₹799 and this opens" from "this does not exist and no amount of money
helps", and clicking a lock would be a coin flip between checkout and a dead end.

`--chrome` is right for the Pro tag because the README already reserves it for
"things that mean something" and never for hover.

### Overlays

Inline and blur-peek only. No modals anywhere.

Gated controls render disabled, with the reason and a CTA beside them. Pro-gated
content shows the first real rows and fades the rest under a CTA. `/upgrade` is
the only full-page ask.

**The peek only ever fades the candidate's own real rows.** Blurring invented
numbers to imply value would be fabrication, and this product's whole claim is
honest measurement. You have the real thing to blur, so use it:

```
Band history
  7.0  Reading   12 Aug
  6.5  Writing   09 Aug
  6.5  Reading   07 Aug
 ──────── fade ────────
  ░░░ 41 more attempts  [PRO]
  See your full history · Upgrade →
```

No modal is introduced because the exam screens are full-bleed surfaces with
their own `sticky top-0` header, and nothing in this app moves under the
candidate.

### Where the ask appears

Four moments, and no others:

- **The writing wall** — `Start Task 2` disabled, meter and reset date shown.
- **The Coach wall** — composer replaced by the block, never a dead input.
- **The Progress peek** — the fade above.
- **The report** — on the first one, and on the one that spends the last mark.

The report is the peak moment: band, four criteria, sentence-level annotations,
just delivered. The block sits _below_ the full report, never above it, so the
feedback they came for is never interrupted. It is silent on every other report
— the same block under every report is wallpaper within three views, and starts
making the feedback feel like bait.

Never during an attempt on `/reading` or `/writing`.

### Coach specifically

Count user messages, not assistant replies. `10 of 10 this week` sits by the
composer from the first visit, so the allowance reads as something they have
rather than something being taken; at 2 remaining it becomes a warning; at 0 the
composer is replaced by the block with the reset date and the CTA.

`/api/coach` returns 402 and the client renders that block — never a stream that
dies. An answer already being written is never truncated.

### Where the persistent entry lives

Not in `NAV_LINKS`. Five tabs is the ceiling and `mobile-nav.tsx` renders that
list as-is, so a sixth destination has nowhere to go on a phone.

Instead: a permanent row in Settings, and a compact block below the sidebar
separator on desktop, rendered only for non-Pro users, carrying the founding
countdown. On a phone the meter line on Today carries it.

No global banner. That would introduce the header this app deliberately does not
have, and the exam screens cancel the layout padding with `-m-6` to go
full-bleed — a banner either fights their sticky header or needs suppressing
per-route, which is the coupling the no-header rule exists to avoid.

## Persuasion: what is used, and what is refused

Used, because every one of them is true of the specific person reading it:

- **Test-date urgency** from `profiles.test_date` — "Your test is in 47 days;
  the 3-month plan covers you through it."
- **Goal-gap framing** from `target_band` against the measured band — "You're at
  6.5, targeting 7.5, and Writing is the gap." The weakest skill comes straight
  from `insight.ts`.
- **Price reframing** — ~₹26 a day beside the real monthly figure, the quarterly
  saving, and the comparison to a real IELTS retake fee. Reframings, not tricks:
  the actual charge stays the most prominent number.
- **Risk reversal** — the 7-day refund, prominent at the decision point. At ₹799
  this is carrying real weight.
- **A real founding deadline** — the price genuinely rises on a fixed date and
  the discount is honoured for anyone who bought before it.
- **Endowed progress** — the meter is visible from the start, so exhaustion is
  anticipated rather than sprung.

Refused, deliberately:

- **Recurring countdowns that reset.** A fake discount, which
  `sections.ts` names in its own honesty rules, and candidates comparing notes in
  a WhatsApp group spot the reset within a week.
- **Invented user counts and testimonials.** Same rule. The honest version is
  available later: `activitySummary()` and `attempts` can produce a real live
  count once there are enough users for one, and it should render nothing rather
  than an embarrassing figure.
- **Confirmshaming decline copy.** A plain "Not now" costs almost nothing by
  comparison, and the alternative is what ends up screenshotted.
- **Hard-to-find cancellation.** Easy cancellation is what makes a ₹799 purchase
  feel safe in the first place; it converts more than it churns.

## Cancellation

A row in Settings, a server action calling `subscriptions.cancel` with
`cancel_at_cycle_end`, and a confirm dialog in the `submit-confirm.tsx` idiom —
which exists precisely because a dialog should say what is at stake instead of
"are you sure":

```
You'll keep Pro until 14 September.
After that: 2 essay marks a week, 10 Coach messages.
[Keep Pro]  [Cancel it]
```

## Where the code goes

```
src/lib/entitlements.ts       pure decisions, no db
src/lib/entitlements.test.ts  node --test, no fixture
src/lib/db/queries.ts         isPro, the two counts
src/app/(app)/upgrade/        the page and its action
src/app/api/razorpay/         the webhook (see below)
```

The decisions are pure functions over numbers and dates —
`canStartEssay({ isPro, usedThisWeek })`, `nextResetAt(dates)`,
`isFoundingPriceActive(now)` — the same shape as `grading.ts`, `study-plan.ts`
and `insight.ts`, and tested the same way: boundaries, one over the limit, the
rolling-window edge, a granted row, an expired subscription. This repo has no
database fixture, so logic that needs one ships untested.

`queries.ts` supplies `isPro` and the counts and remains the only module that
imports `db`.

**The hard checks live in the server actions and in `/api/coach`, beside
`requireUserId()`.** A disabled button is decoration. This mirrors the rule the
app already follows: the gate is at each resource, not in the proxy.

### The second route handler

`apps/app/README.md` says of `/api/coach`: "It is not a precedent. If you are
about to add a second handler, check first whether an action would do."

Checked. It will not: webhook signature verification needs the raw request body,
which a server action does not receive. The Razorpay webhook is the second and
last handler, and it authenticates by HMAC rather than by session, because the
caller is Razorpay and not a signed-in user.

## Measurement

PostHog, server-side only (`posthog-node`), `distinct_id` = the Clerk user id.

Captured from server actions, gated page renders and the webhook. No client
bundle, no cookies, no consent banner — and revenue events come from the webhook
so they cannot be spoofed or lost to an adblocker, which takes a meaningful slice
of client-side conversion data in India.

Events: `quota_exhausted` (with `surface`), `upgrade_viewed` (with `source`),
`checkout_started`, `subscription_activated`, `subscription_cancelled`,
`trial_ended`.

`source` values distinguish the four moments — `writing_wall`, `coach_wall`,
`progress_peek`, `report_moment`, plus `settings` and `trial_expiry` — so a
prompt that does not convert can be cut rather than defended.

Session replay would be the most useful single input for conversion work. It
needs `posthog-js`, a provider component and a cookie disclosure; add it when
there is enough traffic for a funnel to mean anything.

## Ship order

Razorpay activation is the long pole — KYC plus publicly reachable legal pages,
reviewed on a clock you do not control. Test mode works immediately.

1. **Legal pages + KYC submitted.** Blocks nothing else; start it first.
2. **`subscriptions` table, `entitlements.ts`, tests.**
3. **Grants** — beta users to 90 days, new signups to a 7-day trial.
4. **Gates, locks, meters, peek, `/upgrade`** — shipped _inert_, since everyone
   holds a grant. The gating code runs in production while being harmless.
5. **Razorpay checkout, webhook, PostHog.**
6. **Flip** — ₹ prices on `apps/web`, tier-card labels, FAQ corrections.

## Open before building

1. **The founding-price end date.** The countdown needs a real one, and the
   price must actually rise when it passes.
2. **A contact email** for the refund policy and the Contact Us page.
3. **Razorpay account state** — registered? KYC started?

## Required consistency fixes

These follow from decisions above and are not optional once money changes hands.

4. **`apps/web` has one page.** `/about`, `/contact`, `/privacy` and `/terms` are
   linked from the footer and all 404. Razorpay activation requires Terms,
   Privacy, Refund & Cancellation, Contact Us and Pricing to be publicly
   reachable on the submitted domain.
5. **Two FAQ answers are false.** `sections.ts:426` answers "Yes" to Speaking
   analysis and `:430` answers "Yes" to complete mock tests. Neither exists —
   there is no audio, no transcription and no Listening content. "Coming soon" on
   the tier card cannot coexist with "Yes" in the FAQ.
6. **Mock tests and Speaking analysis stay on the Pro card, labelled "coming
   soon".** That is defensible only while the 7-day refund is honoured without
   argument, because some people will buy partly for them.
7. **Verify the IELTS retake fee** before the comparison ships. ~₹18,000 is an
   estimate used during planning, not a checked figure.
