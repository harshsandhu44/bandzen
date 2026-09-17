CREATE TABLE "exam_score_reports" (
	"mock_attempt_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"exam_key" "exam_key" DEFAULT 'ielts' NOT NULL,
	"exam_version" text DEFAULT '2026' NOT NULL,
	"scoring_version" text NOT NULL,
	"overall" numeric(5, 1),
	"subscores" jsonb NOT NULL,
	"sections" jsonb NOT NULL,
	"task_types" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_score_reports" ADD CONSTRAINT "exam_score_reports_mock_attempt_id_mock_attempts_id_fk" FOREIGN KEY ("mock_attempt_id") REFERENCES "public"."mock_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_score_reports_user_idx" ON "exam_score_reports" USING btree ("user_id","exam_key","created_at" desc);--> statement-breakpoint
-- Default privileges already revoke these for tables created by the migrating
-- role; stated explicitly so the table never depends on which role ran this.
REVOKE ALL ON "exam_score_reports" FROM anon, authenticated;--> statement-breakpoint
-- A new, empty table cannot fail on existing rows. Asserted anyway, as every
-- migration in this chain is: a table that silently did not arrive is worse
-- than a release that stops.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'exam_score_reports'
  ) <> 10 THEN
    RAISE EXCEPTION '0031_exam_score_reports: exam_score_reports is missing columns';
  END IF;
END $$;
