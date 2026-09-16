-- Two things Drizzle cannot express, both of which belong in the ledger so a
-- fresh database is the same database.

-- 1. A profile for every account.
--
-- `profiles` is now the only table with a foreign key into `auth.users`, and
-- the CMS reads `email` and `role` off it instead of calling the auth admin
-- API. Creating it in application code would mean every query below it races
-- the first write; a trigger means the row exists the moment the account does.
--
-- Fires on email change too, so a candidate who changes their address does not
-- leave the CMS showing the old one. `security definer` because the inserting
-- role is GoTrue's, which has no rights in `public`; the empty `search_path` is
-- the standard guard against that privilege being borrowed by a shadowed name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;
--> statement-breakpoint

drop trigger if exists on_auth_user_created on auth.users;
--> statement-breakpoint

create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();
--> statement-breakpoint

-- 2. Nothing reaches these tables except Drizzle.
--
-- Supabase publishes every table in `public` through PostgREST to whoever holds
-- the anon key, which is a public value in the browser bundle. Bandzen never
-- queries that way -- `@bandzen/db` connects as `postgres` over TCP, and
-- supabase-js is used for authentication only -- so the entire REST surface is
-- attack surface with no upside.
--
-- Revoking the grant closes it for every table at once, which is the whole
-- reason to prefer it over enabling RLS on 22 tables and writing a policy for
-- each: a policy that is forgotten on a new table leaks it, whereas a default
-- privilege that is never granted cannot be forgotten.
revoke all on all tables in schema public from anon, authenticated;
--> statement-breakpoint
revoke all on all sequences in schema public from anon, authenticated;
--> statement-breakpoint
revoke all on all functions in schema public from anon, authenticated;
--> statement-breakpoint

-- And the same for whatever is created next.
alter default privileges in schema public revoke all on tables from anon, authenticated;
--> statement-breakpoint
alter default privileges in schema public revoke all on sequences from anon, authenticated;
--> statement-breakpoint
alter default privileges in schema public revoke all on functions from anon, authenticated;
