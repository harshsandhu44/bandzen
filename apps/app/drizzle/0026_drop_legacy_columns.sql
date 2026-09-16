-- One last idempotent sweep before the columns go. 0021 ran before the build
-- that stopped writing them was live, so a row written in that gap can still
-- hold a legacy value that never reached `exam_enrollments`, `attempts.score`
-- or `reports.score`. Fill it, assert it, then drop.
--
-- Unlike 0021 this does NOT reconcile an existing enrollment back to the
-- profile: since app@1.23.1 the enrollment is the only thing written, so a
-- profile column that disagrees with it is stale by design, not a bug.
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
UPDATE "attempts" SET "score" = "band" WHERE "score" IS NULL AND "band" IS NOT NULL;--> statement-breakpoint
UPDATE "reports" SET "score" = "band" WHERE "score" IS NULL AND "band" IS NOT NULL;--> statement-breakpoint
-- Fails the migration, and so the release, rather than drop a column whose
-- value is not already somewhere else.
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM "profiles" p
  WHERE (p."exam_type" IS NOT NULL OR p."target_band" IS NOT NULL OR p."self_assessed_band" IS NOT NULL
         OR p."test_date" IS NOT NULL OR p."onboarding_completed_at" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "exam_enrollments" e WHERE e."user_id" = p."user_id" AND e."exam_key" = p."active_exam_key");
  IF n > 0 THEN RAISE EXCEPTION '0026_drop_legacy_columns: % profiles have no active enrollment', n; END IF;

  SELECT count(*) INTO n FROM "attempts" WHERE "band" IS NOT NULL AND "score" IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '0026_drop_legacy_columns: % attempts would lose their band', n; END IF;

  SELECT count(*) INTO n FROM "reports" WHERE "band" IS NOT NULL AND "score" IS NULL;
  IF n > 0 THEN RAISE EXCEPTION '0026_drop_legacy_columns: % reports would lose their band', n; END IF;
END $$;--> statement-breakpoint
ALTER TABLE "attempts" DROP COLUMN "band";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "exam_type";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "target_band";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "test_date";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "self_assessed_band";--> statement-breakpoint
ALTER TABLE "reports" DROP COLUMN "band";
