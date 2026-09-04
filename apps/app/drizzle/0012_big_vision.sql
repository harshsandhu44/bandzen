CREATE TYPE "public"."content_event_action" AS ENUM('created', 'updated', 'published', 'unpublished', 'deleted');--> statement-breakpoint
CREATE TABLE "content_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"actor_id" text,
	"action" "content_event_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "content_events_entity_idx" ON "content_events" USING btree ("entity_type","entity_id","created_at" desc);