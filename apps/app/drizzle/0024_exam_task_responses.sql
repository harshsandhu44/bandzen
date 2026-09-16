CREATE TABLE "exam_task_responses" (
	"attempt_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"value" text,
	"audio_url" text,
	"flagged" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_task_responses_attempt_id_task_id_pk" PRIMARY KEY("attempt_id","task_id")
);
--> statement-breakpoint
ALTER TABLE "exam_task_responses" ADD CONSTRAINT "exam_task_responses_attempt_id_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_task_responses" ADD CONSTRAINT "exam_task_responses_task_id_exam_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."exam_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_task_responses_task_idx" ON "exam_task_responses" USING btree ("task_id");

--> statement-breakpoint
-- The table is new and empty, so there is nothing to backfill. What this
-- asserts is the shape the writers depend on: the composite key that makes
-- autosave an upsert, and both cascades, so deleting an attempt or retiring a
-- task can never leave an orphaned answer behind.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'exam_task_responses'::regclass AND contype = 'p'
  ) THEN
    RAISE EXCEPTION 'exam_task_responses has no primary key';
  END IF;
  IF (
    SELECT count(*) FROM pg_constraint
    WHERE conrelid = 'exam_task_responses'::regclass
      AND contype = 'f' AND confdeltype = 'c'
  ) <> 2 THEN
    RAISE EXCEPTION 'exam_task_responses is missing a cascading foreign key';
  END IF;
END $$;
