CREATE TYPE "public"."plan_assignment_status" AS ENUM('pending', 'in_progress', 'completed', 'skipped', 'deferred');--> statement-breakpoint
CREATE TYPE "public"."plan_target_kind" AS ENUM('passage', 'prompt', 'track', 'lesson', 'task_type');--> statement-breakpoint
CREATE TABLE "plan_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_key" "exam_key" DEFAULT 'ielts' NOT NULL,
	"exam_version" text DEFAULT '2026' NOT NULL,
	"date" date NOT NULL,
	"original_date" date NOT NULL,
	"slot" integer NOT NULL,
	"skill" "attempt_module" NOT NULL,
	"target_kind" "plan_target_kind" NOT NULL,
	"target_id" text NOT NULL,
	"label" text NOT NULL,
	"minutes" integer NOT NULL,
	"status" "plan_assignment_status" DEFAULT 'pending' NOT NULL,
	"attempt_id" uuid,
	"completed_at" timestamp with time zone,
	"revision" integer DEFAULT 1 NOT NULL,
	"planner_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "plan_assignment_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "plan_assignments_day_slot_key" ON "plan_assignments" USING btree ("user_id","exam_key","date","slot");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_plan_assignment_id_plan_assignments_id_fk" FOREIGN KEY ("plan_assignment_id") REFERENCES "public"."plan_assignments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
REVOKE ALL ON "plan_assignments" FROM anon, authenticated;--> statement-breakpoint
-- A new table and a nullable column. No existing user has assignments: the
-- first plan read after this ships commits theirs (#131). Asserted anyway,
-- as every migration in this chain is.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns WHERE table_name = 'plan_assignments'
  ) <> 19 OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attempts' AND column_name = 'plan_assignment_id'
  ) THEN
    RAISE EXCEPTION '0035_plan_assignments: plan_assignments or attempts.plan_assignment_id is missing';
  END IF;
END $$;
