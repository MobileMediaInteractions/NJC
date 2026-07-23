CREATE TABLE "analytics_daily_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" text NOT NULL,
	"pathname" text NOT NULL,
	"story_id" uuid,
	"story_slug" text,
	"story_headline" text,
	"views" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_period_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"total_views" integer DEFAULT 0 NOT NULL,
	"story_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"path_views" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analytics_daily_views" ADD CONSTRAINT "analytics_daily_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_daily_views_day_path_idx" ON "analytics_daily_views" USING btree ("day","pathname");--> statement-breakpoint
CREATE INDEX "analytics_daily_views_day_idx" ON "analytics_daily_views" USING btree ("day");--> statement-breakpoint
CREATE INDEX "analytics_daily_views_story_day_idx" ON "analytics_daily_views" USING btree ("story_slug","day");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_period_archives_period_start_idx" ON "analytics_period_archives" USING btree ("period","period_start");--> statement-breakpoint
CREATE INDEX "analytics_period_archives_period_end_idx" ON "analytics_period_archives" USING btree ("period","period_end");