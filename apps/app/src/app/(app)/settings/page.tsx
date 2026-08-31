import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, SectionHeader } from '@/components/app/primitives';
import { ThemeToggle } from '@/components/theme-toggle';
import { requireUserId } from '@/lib/auth';
import { getProfile } from '@/lib/db/queries';
import { SettingsForm } from './settings-form';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [profile, user] = await Promise.all([
    getProfile(userId),
    currentUser(),
  ]);

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
