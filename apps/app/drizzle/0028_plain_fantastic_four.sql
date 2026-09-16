ALTER TABLE "ai_usage" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "attempts" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "awards" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "coach_messages" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "content_events" ALTER COLUMN "actor_id" SET DATA TYPE uuid USING "actor_id"::uuid;--> statement-breakpoint
ALTER TABLE "exam_enrollments" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "exam_tasks" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "lesson_progress" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "listening_tracks" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "mock_attempts" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "official_scores" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "passages" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "resources" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "speaking_tests" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "user_id" SET DATA TYPE uuid USING "user_id"::uuid;--> statement-breakpoint
ALTER TABLE "writing_prompts" ALTER COLUMN "updated_by" SET DATA TYPE uuid USING "updated_by"::uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;