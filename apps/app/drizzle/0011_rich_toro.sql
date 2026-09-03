ALTER TYPE "public"."attempt_module" ADD VALUE 'speaking';--> statement-breakpoint
CREATE TABLE "speaking_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"part" integer NOT NULL,
	"text" text NOT NULL,
	"cue_card_points" jsonb,
	"prep_seconds" integer DEFAULT 0 NOT NULL,
	"audio_url" text
);
--> statement-breakpoint
CREATE TABLE "speaking_responses" (
	"attempt_id" uuid NOT NULL,
	"prompt_id" uuid NOT NULL,
	"audio_url" text NOT NULL,
	"transcript" text,
	"duration_seconds" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speaking_responses_attempt_id_prompt_id_pk" PRIMARY KEY("attempt_id","prompt_id")
);
--> statement-breakpoint
CREATE TABLE "speaking_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"topic" text,
	"generation_error" text,
	"generation_started_at" timestamp with time zone,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "speaking_tests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "speaking_test_id" uuid;--> statement-breakpoint
ALTER TABLE "speaking_prompts" ADD CONSTRAINT "speaking_prompts_test_id_speaking_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."speaking_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_responses" ADD CONSTRAINT "speaking_responses_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_responses" ADD CONSTRAINT "speaking_responses_prompt_id_speaking_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."speaking_prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "speaking_prompts_test_idx_key" ON "speaking_prompts" USING btree ("test_id","idx");--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_speaking_test_id_speaking_tests_id_fk" FOREIGN KEY ("speaking_test_id") REFERENCES "public"."speaking_tests"("id") ON DELETE set null ON UPDATE no action;