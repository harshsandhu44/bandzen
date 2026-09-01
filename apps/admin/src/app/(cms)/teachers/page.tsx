import { clerkClient } from '@clerk/nextjs/server';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import {
  EmptyState,
  Eyebrow,
  PageHeader,
} from '@bandzen/ui/components/primitives';
import { requireAdmin } from '@/lib/auth';
import { GrantForm } from './grant-form';
import { revokeRole } from './actions';

export const metadata = { title: 'Teachers' };

type Role = 'admin' | 'teacher';

export default async function TeachersPage() {
  await requireAdmin();

  const clerk = await clerkClient();
  // ponytail: single page of up to 100 users. Add pagination if this product
  // ever has more staff than that — nothing here suggests it will soon.
  const { data: users } = await clerk.users.getUserList({ limit: 100 });
  const staff = users
    .map((u) => ({
      id: u.id,
      email: u.primaryEmailAddress?.emailAddress ?? '(no email)',
      role: u.publicMetadata.role as Role | undefined,
    }))
    .filter((u): u is { id: string; email: string; role: Role } => !!u.role);

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Access"
        title="Teachers"
        description="Teachers can create, edit and publish every kind of content. Only an admin can grant or revoke a role."
      />

      <Card>
        <CardHeader>
          <CardTitle>Grant a role</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current admins &amp; teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState
              title="Nobody has a role yet"
              description="Grant the teacher role above to let someone edit content, or admin to let them grant roles too."
            />
          ) : (
            <ul className="divide-y divide-border">
              {staff.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-sm">{person.email}</p>
                    <Eyebrow>{person.role}</Eyebrow>
                  </div>
                  <form action={revokeRole}>
                    <input type="hidden" name="userId" value={person.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Revoke
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
