CREATE TYPE "public"."plan_revision_reason" AS ENUM('settings_changed', 'new_score', 'user_replan', 'missed_work', 'content_unavailable', 'paused', 'resumed');--> statement-breakpoint
CREATE TABLE "plan_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_key" "exam_key" NOT NULL,
	"revision" integer NOT NULL,
	"reason" "plan_revision_reason" NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_enrollments" ADD COLUMN "plan_paused_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_assignments" ADD COLUMN "skip_reason" text;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_revisions_user_exam_revision_key" ON "plan_revisions" USING btree ("user_id","exam_key","revision");--> statement-breakpoint
REVOKE ALL ON "plan_revisions" FROM anon, authenticated;--> statement-breakpoint
-- Additive: a new table and two nullable columns (#131). Asserted anyway, as
-- every migration in this chain is.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE (table_name = 'plan_revisions')
       OR (table_name = 'exam_enrollments' AND column_name = 'plan_paused_at')
       OR (table_name = 'plan_assignments' AND column_name = 'skip_reason')
  ) <> 9 THEN
    RAISE EXCEPTION '0037_plan_controls: plan_revisions, plan_paused_at or skip_reason is missing';
  END IF;
END $$;
