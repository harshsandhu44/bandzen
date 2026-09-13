CREATE TYPE "public"."sitting_kind" AS ENUM('mock', 'diagnostic');--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "writing_task1_prompt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "speaking_test_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "kind" "sitting_kind" DEFAULT 'mock' NOT NULL;