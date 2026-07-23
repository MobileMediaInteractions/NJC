DROP INDEX "analytics_daily_views_day_path_idx";--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "traffic_source" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "device_platform" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "entries" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "source_views" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "device_views" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_views_day_path_source_device_idx" ON "analytics_daily_views" USING btree ("day","pathname","traffic_source","device_platform");--> statement-breakpoint
CREATE INDEX "analytics_daily_views_source_day_idx" ON "analytics_daily_views" USING btree ("traffic_source","day");--> statement-breakpoint
CREATE INDEX "analytics_daily_views_device_day_idx" ON "analytics_daily_views" USING btree ("device_platform","day");