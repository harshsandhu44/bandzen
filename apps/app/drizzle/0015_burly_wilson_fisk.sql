-- Written by hand rather than as generated. The dev database already has all
-- of this from a `db:push`, production has none of it, and one migration has
-- to be correct against both -- so every statement is idempotent.
DO $$ BEGIN
  CREATE TYPE "public"."sitting_kind" AS ENUM('mock', 'diagnostic');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "writing_task1_prompt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "speaking_test_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN IF NOT EXISTS "kind" "sitting_kind" DEFAULT 'mock' NOT NULL;
