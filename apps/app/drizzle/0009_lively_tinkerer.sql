ALTER TYPE "public"."attempt_module" ADD VALUE 'listening';--> statement-breakpoint
ALTER TYPE "public"."question_kind" ADD VALUE 'matching';--> statement-breakpoint
CREATE TABLE "listening_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"topic" text,
	"transcript" text NOT NULL,
	"audio_url" text NOT NULL,
	"matching_options" jsonb,
	"difficulty" integer DEFAULT 3 NOT NULL,
	"status" "content_status" DEFAULT 'published' NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listening_tracks_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "questions" ALTER COLUMN "passage_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "attempts" ADD COLUMN "track_id" uuid;--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "track_id" uuid;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_track_id_listening_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."listening_tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_track_id_listening_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."listening_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "questions_track_idx_key" ON "questions" USING btree ("track_id","idx");