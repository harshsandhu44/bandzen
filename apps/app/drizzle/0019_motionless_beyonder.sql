CREATE TYPE "public"."ai_feature" AS ENUM('writing_grader', 'speaking_grader', 'coach', 'tutor', 'content_generator', 'transcribe');--> statement-breakpoint
CREATE TYPE "public"."ai_status" AS ENUM('ok', 'failed');--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"attempt_id" uuid,
	"feature" "ai_feature" NOT NULL,
	"model" text NOT NULL,
	"request_id" text,
	"trace_id" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"reasoning_tokens" integer DEFAULT 0 NOT NULL,
	"audio_input_tokens" integer,
	"tool_calls" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer NOT NULL,
	"status" "ai_status" NOT NULL,
	"error_code" text,
	"estimated_cost_usd" numeric(10, 6),
	"pricing_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_usage_feature_created_idx" ON "ai_usage" USING btree ("feature","created_at" desc);--> statement-breakpoint
CREATE INDEX "ai_usage_user_created_idx" ON "ai_usage" USING btree ("user_id","created_at" desc);--> statement-breakpoint
CREATE INDEX "ai_usage_attempt_idx" ON "ai_usage" USING btree ("attempt_id");