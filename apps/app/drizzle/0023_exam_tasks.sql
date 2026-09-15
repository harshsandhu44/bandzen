CREATE TABLE "exam_task_answers" (
	"task_id" uuid PRIMARY KEY NOT NULL,
	"answer" jsonb,
	"transcript" text
);
--> statement-breakpoint
CREATE TABLE "exam_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"exam_key" "exam_key" NOT NULL,
	"exam_version" text NOT NULL,
	"section" text NOT NULL,
	"task_type" text NOT NULL,
	"content" jsonb NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_tasks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "exam_task_answers" ADD CONSTRAINT "exam_task_answers_task_id_exam_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."exam_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_tasks_exam_task_idx" ON "exam_tasks" USING btree ("exam_key","task_type");