ALTER TABLE "exam_task_responses" ADD COLUMN "stimulus_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exam_task_responses" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
-- Additive and nullable, so it cannot fail on existing rows. Asserted anyway,
-- as every migration in this chain is.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'exam_task_responses'
      AND column_name IN ('stimulus_started_at', 'completed_at')
  ) <> 2 THEN
    RAISE EXCEPTION '0032_exam_task_response_progress: exam_task_responses is missing a progress column';
  END IF;
END $$;
