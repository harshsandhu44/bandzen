CREATE TYPE "public"."official_score_source" AS ENUM('official', 'official_practice');--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "listening" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "reading" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "speaking" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "writing" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "official_scores" ADD COLUMN "source" "official_score_source" DEFAULT 'official' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "official_scores_mock_attempt_key" ON "official_scores" USING btree ("mock_attempt_id");--> statement-breakpoint
-- 0025/0027 never stated this, unlike 0031; the default privileges already
-- deny it, so this only makes the table independent of who ran them.
REVOKE ALL ON "official_scores" FROM anon, authenticated;--> statement-breakpoint
-- Additive, nullable or defaulted; only the unique index could meet existing
-- rows (a sitting reported twice), and it would have failed above. Asserted
-- anyway, as every migration in this chain is.
DO $$
BEGIN
  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_name = 'official_scores'
      AND column_name IN ('listening', 'reading', 'speaking', 'writing', 'source')
  ) <> 5 OR NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'official_scores_mock_attempt_key'
  ) THEN
    RAISE EXCEPTION '0034_official_score_skills: official_scores is missing a skill column or its sitting index';
  END IF;
END $$;
