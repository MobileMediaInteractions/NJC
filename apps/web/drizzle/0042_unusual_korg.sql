CREATE TABLE "studio_magazines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source_kind" text DEFAULT 'composer' NOT NULL,
	"source_asset_id" uuid,
	"pages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"page_count" integer DEFAULT 0 NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_magazines_status_check" CHECK ("studio_magazines"."status" in ('draft', 'review', 'approved', 'archived')),
	CONSTRAINT "studio_magazines_source_kind_check" CHECK ("studio_magazines"."source_kind" in ('composer', 'bookwright-pdf')),
	CONSTRAINT "studio_magazines_page_count_check" CHECK ("studio_magazines"."page_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "studio_magazines" ADD CONSTRAINT "studio_magazines_source_asset_id_media_assets_id_fk" FOREIGN KEY ("source_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "studio_magazines_slug_idx" ON "studio_magazines" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "studio_magazines_status_updated_idx" ON "studio_magazines" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "studio_magazines_source_asset_idx" ON "studio_magazines" USING btree ("source_asset_id");