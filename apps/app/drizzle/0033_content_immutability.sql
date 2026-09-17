ALTER TABLE "attempt_answers" DROP CONSTRAINT "attempt_answers_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_passage_id_passages_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_prompt_id_writing_prompts_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_track_id_listening_tracks_id_fk";
--> statement-breakpoint
ALTER TABLE "attempts" DROP CONSTRAINT "attempts_speaking_test_id_speaking_tests_id_fk";
--> statement-breakpoint
ALTER TABLE "exam_task_responses" DROP CONSTRAINT "exam_task_responses_task_id_exam_tasks_id_fk";
--> statement-breakpoint
ALTER TABLE "speaking_responses" DROP CONSTRAINT "speaking_responses_prompt_id_speaking_prompts_id_fk";
--> statement-breakpoint
ALTER TABLE "attempt_answers" ADD CONSTRAINT "attempt_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_passage_id_passages_id_fk" FOREIGN KEY ("passage_id") REFERENCES "public"."passages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_prompt_id_writing_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."writing_prompts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_track_id_listening_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."listening_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_speaking_test_id_speaking_tests_id_fk" FOREIGN KEY ("speaking_test_id") REFERENCES "public"."speaking_tests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_task_responses" ADD CONSTRAINT "exam_task_responses_task_id_exam_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."exam_tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "speaking_responses" ADD CONSTRAINT "speaking_responses_prompt_id_speaking_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."speaking_prompts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- #120: a content row a candidate has sat is its own revision. Editing it
-- would change what their review shows and what their grade was marked
-- against, so once anything references it, only its publishing state (and a
-- track's or test's audio-generation bookkeeping) may change. A fix is a new
-- draft: the CMS offers "Duplicate as new draft". The FKs above stop the
-- delete; this stops the edit, and the delete of child rows (questions,
-- prompts, answer keys) that no FK sees.
CREATE OR REPLACE FUNCTION public.content_is_sat(tbl text, r jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SET search_path = public AS $$
BEGIN
  RETURN CASE tbl
    WHEN 'exam_tasks' THEN EXISTS (SELECT 1 FROM exam_task_responses WHERE task_id = (r->>'id')::uuid)
    WHEN 'exam_task_answers' THEN EXISTS (SELECT 1 FROM exam_task_responses WHERE task_id = (r->>'task_id')::uuid)
    WHEN 'passages' THEN EXISTS (SELECT 1 FROM attempts WHERE passage_id = (r->>'id')::uuid)
    WHEN 'listening_tracks' THEN EXISTS (SELECT 1 FROM attempts WHERE track_id = (r->>'id')::uuid)
    WHEN 'writing_prompts' THEN EXISTS (SELECT 1 FROM attempts WHERE prompt_id = (r->>'id')::uuid)
    WHEN 'speaking_tests' THEN EXISTS (SELECT 1 FROM attempts WHERE speaking_test_id = (r->>'id')::uuid)
    WHEN 'speaking_prompts' THEN EXISTS (SELECT 1 FROM attempts WHERE speaking_test_id = (r->>'test_id')::uuid)
    WHEN 'questions' THEN EXISTS (
      SELECT 1 FROM attempts
      WHERE passage_id = (r->>'passage_id')::uuid OR track_id = (r->>'track_id')::uuid)
    WHEN 'question_answers' THEN EXISTS (
      SELECT 1 FROM questions q JOIN attempts a
        ON a.passage_id = q.passage_id OR a.track_id = q.track_id
      WHERE q.id = (r->>'question_id')::uuid)
  END;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.reject_sat_content_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  -- Columns that may change on sat content: publishing state and generation bookkeeping.
  free text[] := ARRAY['status', 'updated_by', 'updated_at', 'generation_error', 'generation_started_at'];
BEGIN
  IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - free) = (to_jsonb(OLD) - free) THEN
    RETURN NEW;
  END IF;
  IF content_is_sat(TG_TABLE_NAME, to_jsonb(OLD)) THEN
    RAISE EXCEPTION 'Candidates have sat this, so it can no longer be changed. Unpublish it and duplicate it as a new draft instead.'
      USING ERRCODE = 'BZ001';
  END IF;
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END $$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.content_is_sat(text, jsonb) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.reject_sat_content_change() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['exam_tasks', 'exam_task_answers', 'passages', 'questions', 'question_answers',
                           'listening_tracks', 'writing_prompts', 'speaking_tests', 'speaking_prompts'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_sat_content_change()',
                   t || '_sat_immutable', t);
  END LOOP;
END $$;
--> statement-breakpoint
DO $$
BEGIN
  IF (
    SELECT count(*) FROM pg_constraint
    WHERE conname IN (
      'attempt_answers_question_id_questions_id_fk', 'attempts_passage_id_passages_id_fk',
      'attempts_prompt_id_writing_prompts_id_fk', 'attempts_track_id_listening_tracks_id_fk',
      'attempts_speaking_test_id_speaking_tests_id_fk', 'exam_task_responses_task_id_exam_tasks_id_fk',
      'speaking_responses_prompt_id_speaking_prompts_id_fk')
      AND confdeltype = 'r'
  ) <> 7 THEN
    RAISE EXCEPTION '0033_content_immutability: a content foreign key is not ON DELETE RESTRICT';
  END IF;
  IF (SELECT count(*) FROM pg_trigger WHERE tgname LIKE '%\_sat\_immutable') <> 9 THEN
    RAISE EXCEPTION '0033_content_immutability: a sat-content trigger is missing';
  END IF;
END $$;
