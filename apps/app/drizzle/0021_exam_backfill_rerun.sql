-- Re-runs 0020's idempotent backfill and its assertions. 0020 ran before the
-- build that writes enrollments, variants and scores went live, so any row the
-- previous build wrote in that gap is still empty; this fills it, then checks.
-- Backfill: every existing row is IELTS. Idempotent (fills only what is still
-- empty), so it is safe to run again to catch rows written by the previous
-- deploy during the gap between this migration and the new build going live.
INSERT INTO "exam_enrollments" ("user_id", "exam_key", "exam_variant", "exam_version", "target_score", "self_assessed_score", "test_date")
SELECT "user_id", 'ielts', "exam_type"::text, '2026', "target_band", "self_assessed_band", "test_date"
FROM "profiles"
WHERE "exam_type" IS NOT NULL
   OR "target_band" IS NOT NULL
   OR "self_assessed_band" IS NOT NULL
   OR "test_date" IS NOT NULL
   OR "onboarding_completed_at" IS NOT NULL
ON CONFLICT ("user_id", "exam_key") DO NOTHING;--> statement-breakpoint
UPDATE "profiles" p SET "active_exam_key" = 'ielts'
WHERE p."active_exam_key" IS NULL
  AND EXISTS (SELECT 1 FROM "exam_enrollments" e WHERE e."user_id" = p."user_id" AND e."exam_key" = 'ielts');--> statement-breakpoint
-- A sitting's variant is its reading passages' format.
UPDATE "mock_attempts" m SET "exam_variant" = (
  SELECT p."format"::text FROM "passages" p WHERE p."id"::text = m."reading_passage_ids"->>0
)
WHERE m."exam_variant" IS NULL;--> statement-breakpoint
-- Only Reading and Writing differ between Academic and General Training;
-- IELTS Listening and Speaking have no variant.
UPDATE "attempts" a SET "exam_variant" = COALESCE(
  (SELECT p."format"::text FROM "passages" p WHERE p."id" = a."passage_id"),
  (SELECT w."format"::text FROM "writing_prompts" w WHERE w."id" = a."prompt_id"),
  (SELECT m."exam_variant" FROM "mock_attempts" m WHERE m."id" = a."mock_attempt_id")
)
WHERE a."exam_variant" IS NULL AND a."module" IN ('reading', 'writing');--> statement-breakpoint
UPDATE "attempts" a SET "task_type" = CASE a."module"
  WHEN 'reading' THEN CASE WHEN a."passage_id" IS NULL THEN 'reading_section' ELSE 'reading_passage' END
  WHEN 'listening' THEN CASE WHEN a."track_id" IS NULL THEN 'listening_section' ELSE 'listening_track' END
  WHEN 'writing' THEN (SELECT 'writing_task_' || w."task" FROM "writing_prompts" w WHERE w."id" = a."prompt_id")
  WHEN 'speaking' THEN 'speaking_test'
END
WHERE a."task_type" IS NULL;--> statement-breakpoint
UPDATE "attempts" SET "score" = "band" WHERE "score" IS NULL AND "band" IS NOT NULL;--> statement-breakpoint
UPDATE "reports" SET "score" = "band" WHERE "score" IS NULL;--> statement-breakpoint
-- The backfill's own test. Runs wherever the migration runs, production
-- included, and fails the migration (and so the release) rather than ship an
-- app that reads columns the backfill left empty.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "profiles" p
  WHERE (p."exam_type" IS NOT NULL OR p."target_band" IS NOT NULL OR p."self_assessed_band" IS NOT NULL
         OR p."test_date" IS NOT NULL OR p."onboarding_completed_at" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "exam_enrollments" e WHERE e."user_id" = p."user_id" AND e."exam_key" = p."active_exam_key");
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % profiles have no active enrollment', n; END IF;

  SELECT count(*) INTO n FROM "exam_enrollments" e JOIN "profiles" p USING ("user_id")
  WHERE e."exam_key" = 'ielts'
    AND (e."target_score" IS DISTINCT FROM p."target_band"
      OR e."self_assessed_score" IS DISTINCT FROM p."self_assessed_band"
      OR e."test_date" IS DISTINCT FROM p."test_date"
      OR e."exam_variant" IS DISTINCT FROM p."exam_type"::text);
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % enrollments disagree with their profile', n; END IF;

  SELECT count(*) INTO n FROM "attempts" WHERE "score" IS DISTINCT FROM "band" AND "band" IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % attempts lost their band', n; END IF;

  SELECT count(*) INTO n FROM "reports" WHERE "score" IS DISTINCT FROM "band";
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % reports lost their band', n; END IF;

  -- A writing attempt whose prompt was deleted cannot know its task number.
  SELECT count(*) INTO n FROM "attempts"
  WHERE "task_type" IS NULL AND NOT ("module" = 'writing' AND "prompt_id" IS NULL);
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % attempts have no task type', n; END IF;

  SELECT count(*) INTO n FROM "attempts"
  WHERE "exam_variant" IS NULL AND ("passage_id" IS NOT NULL OR "prompt_id" IS NOT NULL);
  IF n > 0 THEN RAISE EXCEPTION '0021_exam_backfill_rerun: % reading/writing attempts have no variant', n; END IF;
END $$;
