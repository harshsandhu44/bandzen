CREATE TYPE "public"."attempt_kind" AS ENUM('practice', 'diagnostic', 'mock');--> statement-breakpoint
CREATE TYPE "public"."attempt_module" AS ENUM('reading', 'writing');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'grading', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('true_false_not_given', 'yes_no_not_given', 'multiple_choice', 'matching_headings', 'sentence_completion');--> statement-breakpoint
CREATE TYPE "public"."test_format" AS ENUM('academic', 'general');--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attempt_answers" (
	"attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value" text,
	"flagged" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attempt_answers_attempt_id_question_id_pk" PRIMARY KEY("attempt_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"module" "attempt_module" NOT NULL,
	"kind" "attempt_kind" DEFAULT 'practice' NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"passage_id" uuid,
	"prompt_id" uuid,
	"parent_id" uuid,
	"raw_score" integer,
	"total" integer,
	"band" numeric(2, 1),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "essays" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "passages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"topic" text,
	"format" "test_format" DEFAULT 'academic' NOT NULL,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "passages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"target_band" numeric(2, 1),
	"test_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_answers" (
	"question_id" uuid PRIMARY KEY NOT NULL,
	"answer" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passage_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"kind" "question_kind" NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"evidence" text,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"attempt_id" uuid PRIMARY KEY NOT NULL,
	"band" numeric(2, 1) NOT NULL,
	"criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"annotations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weaknesses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "writing_prompts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"task" integer NOT NULL,
	"format" "test_format" DEFAULT 'academic' NOT NULL,
	"prompt_text" text NOT NULL,
	"chart_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_prompts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_prompt_id_writing_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_parent_id_attempts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "essays" ADD CONSTRAINT "essays_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_answers" ADD CONSTRAINT "question_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "access_requests_email_key" ON "access_requests" USING btree ("email");--> statement-breakpoint
CREATE INDEX "attempt_answers_question_idx" ON "attempt_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "attempts_user_submitted_idx" ON "attempts" USING btree ("user_id","submitted_at" desc);--> statement-breakpoint
CREATE INDEX "attempts_user_status_idx" ON "attempts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "attempts_parent_idx" ON "attempts" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "questions_passage_idx_key" ON "questions" USING btree ("passage_id","idx");