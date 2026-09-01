-- Finalize the lesson_progress.lesson_id migration from a bare slug (text)
-- to a real FK (uuid -> lessons.id). Safe to run only after
-- scripts/backfill-lesson-progress.mts reports zero orphans.
DELETE FROM "lesson_progress" WHERE "lesson_id_new" IS NULL;--> statement-breakpoint
ALTER TABLE "lesson_progress" DROP CONSTRAINT "lesson_progress_user_id_lesson_id_pk";--> statement-breakpoint
ALTER TABLE "lesson_progress" DROP COLUMN "lesson_id";--> statement-breakpoint
ALTER TABLE "lesson_progress" RENAME COLUMN "lesson_id_new" TO "lesson_id";--> statement-breakpoint
ALTER TABLE "lesson_progress" RENAME CONSTRAINT "lesson_progress_lesson_id_new_lessons_id_fk" TO "lesson_progress_lesson_id_lessons_id_fk";--> statement-breakpoint
ALTER TABLE "lesson_progress" ALTER COLUMN "lesson_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id");
