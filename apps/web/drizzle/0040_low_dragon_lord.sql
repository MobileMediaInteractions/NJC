CREATE TABLE "live_event_update_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"update_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reason" text NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_event_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text DEFAULT 'update' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"headline" text,
	"body" text NOT NULL,
	"media_url" text,
	"media_alt" text,
	"source_url" text,
	"source_label" text,
	"author_snapshot" jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"corrected_at" timestamp with time zone,
	"retracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "live_event_updates_kind_check" CHECK ("live_event_updates"."kind" in ('update', 'breaking', 'result', 'quote', 'context', 'media', 'correction')),
	CONSTRAINT "live_event_updates_status_check" CHECK ("live_event_updates"."status" in ('draft', 'published', 'retracted')),
	CONSTRAINT "live_event_updates_revision_positive_check" CHECK ("live_event_updates"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "hero_image_url" text;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "hero_image_alt" text;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "related_story_id" uuid;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "created_by_clerk_id" text;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "updated_by_clerk_id" text;--> statement-breakpoint
ALTER TABLE "live_events" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "live_events"
SET "status" = CASE
	WHEN "ended_at" IS NOT NULL THEN 'ended'
	WHEN "is_live" = true THEN 'live'
	WHEN "started_at" IS NOT NULL THEN 'paused'
	ELSE 'draft'
END,
"updated_at" = COALESCE("started_at", "created_at", now());--> statement-breakpoint
ALTER TABLE "live_event_update_revisions" ADD CONSTRAINT "live_event_update_revisions_update_id_live_event_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "public"."live_event_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_event_updates" ADD CONSTRAINT "live_event_updates_event_id_live_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."live_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "live_event_update_revisions_version_idx" ON "live_event_update_revisions" USING btree ("update_id","revision");--> statement-breakpoint
CREATE INDEX "live_event_updates_event_published_idx" ON "live_event_updates" USING btree ("event_id","published_at");--> statement-breakpoint
CREATE INDEX "live_event_updates_event_status_idx" ON "live_event_updates" USING btree ("event_id","status");--> statement-breakpoint
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_related_story_id_stories_id_fk" FOREIGN KEY ("related_story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_events_status_started_idx" ON "live_events" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "live_events_featured_idx" ON "live_events" USING btree ("is_featured","status");--> statement-breakpoint
ALTER TABLE "live_events" ADD CONSTRAINT "live_events_status_check" CHECK ("live_events"."status" in ('draft', 'scheduled', 'live', 'paused', 'ended', 'archived'));
