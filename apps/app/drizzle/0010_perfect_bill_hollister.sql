ALTER TABLE "listening_tracks" ALTER COLUMN "transcript" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_tracks" ALTER COLUMN "audio_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "listening_tracks" ADD COLUMN "generation_error" text;--> statement-breakpoint
ALTER TABLE "listening_tracks" ADD COLUMN "generation_started_at" timestamp with time zone;