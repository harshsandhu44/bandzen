CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "exam_type" "test_format";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "self_assessed_band" numeric(2, 1);--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "study_minutes" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "onboarding_completed_at" timestamp with time zone;