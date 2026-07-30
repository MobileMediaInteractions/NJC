CREATE TABLE "analytics_archive_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"revision" integer NOT NULL,
	"calculation_version" integer NOT NULL,
	"quality_status" text NOT NULL,
	"correction_reason" text,
	"total_views" integer DEFAULT 0 NOT NULL,
	"story_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"path_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"device_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text DEFAULT 'page_view' NOT NULL,
	"calculation_version" integer DEFAULT 2 NOT NULL,
	"quality_status" text DEFAULT 'verified' NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"product" text DEFAULT 'news-web' NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"installation_id" text,
	"session_id" text,
	"pathname" text NOT NULL,
	"story_id" uuid,
	"story_slug" text,
	"story_headline" text,
	"traffic_source" text DEFAULT 'direct' NOT NULL,
	"attribution_model" text DEFAULT 'session_first_touch' NOT NULL,
	"device_platform" text DEFAULT 'unknown' NOT NULL,
	"is_entry" boolean DEFAULT false NOT NULL,
	"app_version" text DEFAULT 'unknown' NOT NULL,
	"build_number" text DEFAULT 'unknown' NOT NULL,
	"release_channel" text DEFAULT 'production' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_installation_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" text NOT NULL,
	"platform" text NOT NULL,
	"product" text NOT NULL,
	"release_channel" text DEFAULT 'production' NOT NULL,
	"app_version" text DEFAULT 'unknown' NOT NULL,
	"build_number" text DEFAULT 'unknown' NOT NULL,
	"os_version" text,
	"device_class" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"quality_status" text DEFAULT 'verified' NOT NULL,
	"event_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audience_presence_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"installation_id" text NOT NULL,
	"platform" text NOT NULL,
	"product" text NOT NULL,
	"release_channel" text DEFAULT 'production' NOT NULL,
	"app_version" text DEFAULT 'unknown' NOT NULL,
	"build_number" text DEFAULT 'unknown' NOT NULL,
	"os_version" text,
	"device_class" text,
	"environment" text DEFAULT 'production' NOT NULL,
	"quality_status" text DEFAULT 'verified' NOT NULL,
	"user_clerk_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "analytics_daily_views_day_path_source_device_idx";--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "calculation_version" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "quality_status" text DEFAULT 'verified' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "environment" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD COLUMN "product" text DEFAULT 'news-web' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "calculation_version" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "quality_status" text DEFAULT 'verified' NOT NULL;--> statement-breakpoint
ALTER TABLE "analytics_period_archives" ADD COLUMN "correction_reason" text;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "product" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "release_channel" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "build_number" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "os_version" text;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "device_class" text;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "environment" text DEFAULT 'production' NOT NULL;--> statement-breakpoint
ALTER TABLE "audience_installations" ADD COLUMN "quality_status" text DEFAULT 'verified' NOT NULL;--> statement-breakpoint
UPDATE "analytics_daily_views"
SET "calculation_version" = 1,
	"quality_status" = 'legacy',
	"product" = 'legacy-web';--> statement-breakpoint
UPDATE "analytics_period_archives"
SET "calculation_version" = 1,
	"quality_status" = 'legacy',
	"correction_reason" = 'Pre-audit aggregate retained without event-level evidence';--> statement-breakpoint
UPDATE "audience_installations"
SET "product" = CASE
		WHEN "source" = 'news-site' THEN 'news-web'
		WHEN "source" IN ('mobile-app', 'mobile-app-web') THEN 'reader-mobile'
		WHEN "source" = 'employee-app' THEN 'employee-mobile'
		WHEN "source" = 'tv-app' THEN 'reader-tv'
		WHEN "source" = 'roku-app' THEN 'reader-roku'
		ELSE 'unknown'
	END,
	"device_class" = CASE
		WHEN "platform" = 'web' THEN 'browser'
		WHEN "platform" IN ('ios', 'android') THEN 'phone'
		WHEN "platform" IN ('tvos', 'androidtv', 'roku') THEN 'tv'
		ELSE 'unknown'
	END,
	"quality_status" = 'legacy';--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_installation_versions" ADD CONSTRAINT "audience_installation_versions_installation_id_audience_installations_installation_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."audience_installations"("installation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "audience_installation_versions" (
	"installation_id",
	"platform",
	"product",
	"release_channel",
	"app_version",
	"build_number",
	"os_version",
	"device_class",
	"environment",
	"quality_status",
	"event_count",
	"first_seen_at",
	"last_seen_at"
)
SELECT
	"installation_id",
	"platform",
	"product",
	"release_channel",
	coalesce("app_version", 'unknown'),
	"build_number",
	"os_version",
	"device_class",
	"environment",
	'legacy',
	"event_count",
	"first_seen_at",
	"last_seen_at"
FROM "audience_installations";--> statement-breakpoint
INSERT INTO "analytics_archive_revisions" (
	"period",
	"period_start",
	"period_end",
	"revision",
	"calculation_version",
	"quality_status",
	"correction_reason",
	"total_views",
	"story_views",
	"path_views",
	"source_views",
	"device_views",
	"generated_at"
)
SELECT
	"period",
	"period_start",
	"period_end",
	1,
	1,
	'legacy',
	'Pre-audit aggregate retained without event-level evidence',
	"total_views",
	"story_views",
	"path_views",
	"source_views",
	"device_views",
	"generated_at"
FROM "analytics_period_archives";--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_archive_revisions_period_revision_idx" ON "analytics_archive_revisions" USING btree ("period","period_start","revision");--> statement-breakpoint
CREATE INDEX "analytics_archive_revisions_generated_idx" ON "analytics_archive_revisions" USING btree ("generated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_events_event_idx" ON "analytics_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "analytics_events_received_idx" ON "analytics_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "analytics_events_story_received_idx" ON "analytics_events" USING btree ("story_slug","received_at");--> statement-breakpoint
CREATE INDEX "analytics_events_installation_received_idx" ON "analytics_events" USING btree ("installation_id","received_at");--> statement-breakpoint
CREATE INDEX "analytics_events_quality_received_idx" ON "analytics_events" USING btree ("calculation_version","quality_status","environment","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "audience_installation_versions_identity_idx" ON "audience_installation_versions" USING btree ("installation_id","product","release_channel","app_version","build_number");--> statement-breakpoint
CREATE INDEX "audience_installation_versions_platform_seen_idx" ON "audience_installation_versions" USING btree ("platform","last_seen_at");--> statement-breakpoint
CREATE INDEX "audience_installation_versions_version_seen_idx" ON "audience_installation_versions" USING btree ("product","app_version","build_number","last_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "audience_presence_events_event_idx" ON "audience_presence_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "audience_presence_events_installation_time_idx" ON "audience_presence_events" USING btree ("installation_id","received_at");--> statement-breakpoint
CREATE INDEX "audience_presence_events_platform_time_idx" ON "audience_presence_events" USING btree ("platform","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_views_day_path_source_device_idx" ON "analytics_daily_views" USING btree ("calculation_version","quality_status","environment","product","day","pathname","traffic_source","device_platform");
