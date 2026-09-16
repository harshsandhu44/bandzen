ALTER TABLE "official_scores" ADD COLUMN "mock_attempt_id" uuid;--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "estimated_score" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "scoring_version" text;--> statement-breakpoint
ALTER TABLE "official_scores" ADD CONSTRAINT "official_scores_mock_attempt_id_mock_attempts_id_fk" FOREIGN KEY ("mock_attempt_id") REFERENCES "public"."mock_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Additive and nullable, so it cannot fail on existing rows. The assertion is
-- here anyway, same as every migration in this chain: a column that silently
-- did not arrive is worse than a release that stops.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'official_scores'
      AND column_name IN ('mock_attempt_id', 'estimated_score', 'scoring_version')
  ) <> 3 THEN
    RAISE EXCEPTION '0027_official_score_calibration: official_scores is missing a calibration column';
  END IF;
END $$;
