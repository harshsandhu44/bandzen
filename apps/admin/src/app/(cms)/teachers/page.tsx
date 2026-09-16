import { listStaff } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  Eyebrow,
  PageHeader,
  Panel,
} from '@bandzen/ui/components/primitives';
import { requireAdmin } from '@/lib/auth';
import { GrantForm } from './grant-form';
import { revokeRole } from './actions';

export const metadata = { title: 'Teachers' };

export default async function TeachersPage() {
  await requireAdmin();

  // Only people who hold a role, straight from the profile table -- the old
  // version paged every user out of the auth API and filtered them here.
  const staff = await listStaff();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Access"
        title="Teachers"
        description="Teachers can create, edit and publish every kind of content. Only an admin can grant or revoke a role."
      />

      <Panel title="Grant a role">
        <GrantForm />
      </Panel>

      <Panel title="Current admins &amp; teachers">
        {staff.length === 0 ? (
          <EmptyState
            title="Nobody has a role yet"
            description="Grant the teacher role above to let someone edit content, or admin to let them grant roles too."
          />
        ) : (
          <ul className="divide-y divide-border">
            {staff.map((person) => (
              <li
                key={person.userId}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="text-sm">{person.email ?? '(no email)'}</p>
                  <Eyebrow>{person.role}</Eyebrow>
                </div>
                <form action={revokeRole}>
                  <input type="hidden" name="userId" value={person.userId} />
                  <Button type="submit" variant="ghost" size="sm">
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
