ALTER TABLE "stories" ADD COLUMN "image_asset_id" uuid;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "image_kind" text DEFAULT 'editorial' NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "image_generation" jsonb;--> statement-breakpoint
CREATE INDEX "stories_image_asset_idx" ON "stories" USING btree ("image_asset_id");--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_image_kind_check" CHECK ("stories"."image_kind" in ('editorial', 'ai_placeholder'));