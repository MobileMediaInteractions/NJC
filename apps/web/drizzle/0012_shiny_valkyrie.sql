CREATE TABLE "press_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_type" text DEFAULT 'press_release' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"headline" text NOT NULL,
	"subheadline" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"location" text DEFAULT 'New Brunswick, N.J.' NOT NULL,
	"release_timing" text DEFAULT 'immediate' NOT NULL,
	"release_at" timestamp with time zone,
	"body" text NOT NULL,
	"quote" text DEFAULT '' NOT NULL,
	"quote_attribution" text DEFAULT '' NOT NULL,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"boilerplate" text DEFAULT '' NOT NULL,
	"contact_name" text NOT NULL,
	"contact_title" text DEFAULT '' NOT NULL,
	"contact_email" text NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"website_url" text DEFAULT '' NOT NULL,
	"internal_notes" text DEFAULT '' NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"last_exported_at" timestamp with time zone,
	"export_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "press_releases_status_idx" ON "press_releases" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "press_releases_creator_idx" ON "press_releases" USING btree ("created_by_clerk_id","created_at");