CREATE TYPE "public"."exam_key" AS ENUM('ielts', 'pte_academic', 'toefl_ibt', 'det');--> statement-breakpoint
CREATE TABLE "exam_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"exam_key" "exam_key" NOT NULL,
	"exam_variant" text,
	"exam_version" text NOT NULL,
	"target_score" numeric(5, 1),
	"self_assessed_score" numeric(5, 1),
	"test_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "exam_variant" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "task_type" text;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "score" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_tracks" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_tracks" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "mock_attempts" ADD COLUMN "exam_variant" text;--> statement-breakpoint
ALTER TABLE "passages" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "passages" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "active_exam_key" "exam_key";--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "score" numeric(5, 1);--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "speaking_tests" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "speaking_tests" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "exam_key" "exam_key" DEFAULT 'ielts' NOT NULL;--> statement-breakpoint
ALTER TABLE "writing_prompts" ADD COLUMN "exam_version" text DEFAULT '2026' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_enrollments_user_exam_key" ON "exam_enrollments" USING btree ("user_id","exam_key");--> statement-breakpoint
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
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % profiles have no active enrollment', n; END IF;

  SELECT count(*) INTO n FROM "exam_enrollments" e JOIN "profiles" p USING ("user_id")
  WHERE e."exam_key" = 'ielts'
    AND (e."target_score" IS DISTINCT FROM p."target_band"
      OR e."self_assessed_score" IS DISTINCT FROM p."self_assessed_band"
      OR e."test_date" IS DISTINCT FROM p."test_date"
      OR e."exam_variant" IS DISTINCT FROM p."exam_type"::text);
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % enrollments disagree with their profile', n; END IF;

  SELECT count(*) INTO n FROM "attempts" WHERE "score" IS DISTINCT FROM "band" AND "band" IS NOT NULL;
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % attempts lost their band', n; END IF;

  SELECT count(*) INTO n FROM "reports" WHERE "score" IS DISTINCT FROM "band";
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % reports lost their band', n; END IF;

  -- A writing attempt whose prompt was deleted cannot know its task number.
  SELECT count(*) INTO n FROM "attempts"
  WHERE "task_type" IS NULL AND NOT ("module" = 'writing' AND "prompt_id" IS NULL);
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % attempts have no task type', n; END IF;

  SELECT count(*) INTO n FROM "attempts"
  WHERE "exam_variant" IS NULL AND ("passage_id" IS NOT NULL OR "prompt_id" IS NOT NULL);
  IF n > 0 THEN RAISE EXCEPTION '0020_exam_identity: % reading/writing attempts have no variant', n; END IF;
END $$;
