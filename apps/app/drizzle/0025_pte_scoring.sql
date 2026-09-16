CREATE TABLE "official_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exam_key" "exam_key" DEFAULT 'ielts' NOT NULL,
	"exam_version" text DEFAULT '2026' NOT NULL,
	"score" numeric(5, 1) NOT NULL,
	"taken_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "writing_task2_prompt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reports" ALTER COLUMN "band" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "task_ids" jsonb;--> statement-breakpoint
CREATE INDEX "official_scores_user_idx" ON "official_scores" USING btree ("user_id","exam_key");

--> statement-breakpoint
-- Nothing to backfill: the new column and table are empty, and dropping a NOT
-- NULL never rewrites rows. What this asserts is that the three things PTE
-- scoring depends on are actually true afterwards — `reports.band` is
-- `numeric(2,1)` and cannot hold a score of 79, so it has to be optional
-- before any non-IELTS report can be written at all.
DO $$
BEGIN
  IF (
    SELECT is_nullable FROM information_schema.columns
    WHERE table_name = 'reports' AND column_name = 'band'
  ) <> 'YES' THEN
    RAISE EXCEPTION 'reports.band is still NOT NULL; no non-IELTS score can be written';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mock_attempts' AND column_name = 'task_ids'
  ) THEN
    RAISE EXCEPTION 'mock_attempts.task_ids is missing; an exam-task sitting has nowhere to lock its content';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'official_scores') THEN
    RAISE EXCEPTION 'official_scores is missing';
  END IF;
END $$;
