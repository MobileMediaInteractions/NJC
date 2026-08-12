CREATE TABLE "link_in_bio_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"story_id" uuid NOT NULL,
	"display_title" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"click_count" integer DEFAULT 0 NOT NULL,
	"last_clicked_at" timestamp with time zone,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_in_bio_entries_slug_check" CHECK ("link_in_bio_entries"."slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
	CONSTRAINT "link_in_bio_entries_click_count_check" CHECK ("link_in_bio_entries"."click_count" >= 0),
	CONSTRAINT "link_in_bio_entries_window_check" CHECK ("link_in_bio_entries"."ends_at" is null or "link_in_bio_entries"."starts_at" is null or "link_in_bio_entries"."ends_at" > "link_in_bio_entries"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "link_in_bio_entries" ADD CONSTRAINT "link_in_bio_entries_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "link_in_bio_entries_slug_idx" ON "link_in_bio_entries" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "link_in_bio_entries_story_idx" ON "link_in_bio_entries" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "link_in_bio_entries_public_idx" ON "link_in_bio_entries" USING btree ("is_visible","sort_order");