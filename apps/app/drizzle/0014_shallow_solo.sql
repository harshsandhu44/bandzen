CREATE TABLE "mock_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reading_passage_ids" jsonb NOT NULL,
	"listening_track_ids" jsonb NOT NULL,
	"writing_task1_prompt_id" uuid NOT NULL,
	"writing_task2_prompt_id" uuid NOT NULL,
	"speaking_test_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "mock_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "listening_tracks" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_writing_task1_prompt_id_writing_prompts_id_fk" FOREIGN KEY ("writing_task1_prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_writing_task2_prompt_id_writing_prompts_id_fk" FOREIGN KEY ("writing_task2_prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD CONSTRAINT "mock_attempts_speaking_test_id_speaking_tests_id_fk" FOREIGN KEY ("speaking_test_id") REFERENCES "public"."speaking_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mock_attempts_user_started_idx" ON "mock_attempts" USING btree ("user_id","started_at" desc);--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_mock_attempt_id_mock_attempts_id_fk" FOREIGN KEY ("mock_attempt_id") REFERENCES "public"."mock_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attempts_mock_idx" ON "attempts" USING btree ("mock_attempt_id");