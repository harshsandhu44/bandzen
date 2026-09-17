ALTER TABLE "profiles" ADD COLUMN "study_days" integer[] DEFAULT '{1,2,3,4,5,6,7}' NOT NULL;--> statement-breakpoint
-- Defaulted to every day, so existing candidates plan exactly as before (#131).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'study_days'
  ) OR EXISTS (SELECT 1 FROM profiles WHERE study_days IS NULL) THEN
    RAISE EXCEPTION '0036_study_days: profiles.study_days is missing or unset';
  END IF;
END $$;
