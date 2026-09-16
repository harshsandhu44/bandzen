-- 0029 revoked function access from `anon` and `authenticated`, but Postgres
-- grants EXECUTE on every new function to PUBLIC, which both roles inherit.
-- So `handle_new_user` stayed callable at /rest/v1/rpc/handle_new_user.
-- Postgres refuses to run a trigger function called directly, so nothing
-- could come of it, but 0029's promise that nothing reaches `public` except
-- Drizzle should be true rather than true in practice.
revoke execute on all functions in schema public from public;
--> statement-breakpoint
alter default privileges in schema public revoke execute on functions from public;
