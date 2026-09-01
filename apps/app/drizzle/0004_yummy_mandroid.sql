CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."lesson_group" AS ENUM('foundations', 'question-types', 'advanced');--> statement-breakpoint
CREATE TYPE "public"."resource_category" AS ENUM('strategies', 'reading', 'writing', 'vocabulary', 'grammar', 'exam-day', 'listening', 'speaking');--> statement-breakpoint
CREATE TYPE "public"."resource_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"module" "attempt_module" NOT NULL,
	"group" "lesson_group" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"minutes" integer NOT NULL,
	"question_kind" "question_kind",
	"stages" jsonb,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category" "resource_category" NOT NULL,
	"level" "resource_level" NOT NULL,
	"minutes" integer NOT NULL,
	"module" "attempt_module",
	"question_kind" "question_kind",
	"body" jsonb,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "passages" ADD COLUMN "status" "content_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "passages" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "passages" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "status" "content_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "updated_by" text;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "lessons_module_group_idx" ON "lessons" USING btree ("module","group","order_index");