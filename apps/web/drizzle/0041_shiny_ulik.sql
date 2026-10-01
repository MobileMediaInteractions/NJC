CREATE TABLE "community_bulletins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'community' NOT NULL,
	"description" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"venue" text,
	"city" text,
	"organizer" text,
	"external_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_bulletins_status_check" CHECK ("community_bulletins"."status" in ('draft', 'published', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "community_event_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'community' NOT NULL,
	"description" text NOT NULL,
	"starts_at" timestamp with time zone,
	"venue" text,
	"city" text,
	"organizer" text,
	"external_url" text,
	"submitter_name" text,
	"submitter_email" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_clerk_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_event_submissions_status_check" CHECK ("community_event_submissions"."status" in ('pending', 'reviewing', 'approved', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "news_tips" ADD COLUMN "category" text DEFAULT 'other' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "community_bulletins_slug_idx" ON "community_bulletins" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "community_bulletins_status_starts_idx" ON "community_bulletins" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "community_event_submissions_status_created_idx" ON "community_event_submissions" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "news_tips" ADD CONSTRAINT "news_tips_category_check" CHECK ("news_tips"."category" in ('local-government', 'education', 'public-safety', 'business-development', 'transportation', 'environment', 'health', 'community', 'other'));