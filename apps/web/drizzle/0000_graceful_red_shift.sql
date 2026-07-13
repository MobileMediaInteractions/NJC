CREATE TYPE "public"."comment_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'editor', 'producer', 'reporter', 'contributor');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('idea', 'assigned', 'draft', 'review', 'scheduled', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"link" text,
	"regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" uuid,
	"story_id" uuid,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_name" text NOT NULL,
	"author_email" text NOT NULL,
	"body" text NOT NULL,
	"status" "comment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"stream_url" text,
	"is_live" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"alt_text" text,
	"credit" text,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"lists" jsonb DEFAULT '["daily-brief"]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"headline" text NOT NULL,
	"dek" text DEFAULT '' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_slug" text DEFAULT 'local' NOT NULL,
	"category_label" text DEFAULT 'Local' NOT NULL,
	"location" text DEFAULT 'Harbor County' NOT NULL,
	"status" "story_status" DEFAULT 'draft' NOT NULL,
	"author_id" uuid,
	"author_snapshot" jsonb,
	"image_url" text,
	"image_alt" text,
	"video_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reading_minutes" integer DEFAULT 1 NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"is_exclusive" boolean DEFAULT false NOT NULL,
	"is_developing" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"scheduled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"editor_id" uuid,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "staff_role" DEFAULT 'contributor' NOT NULL,
	"title" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD CONSTRAINT "story_revisions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD CONSTRAINT "story_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_active_idx" ON "alerts" USING btree ("is_active","expires_at");--> statement-breakpoint
CREATE INDEX "assignments_assignee_idx" ON "assignments" USING btree ("assignee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "comments_story_status_idx" ON "comments" USING btree ("story_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "live_events_slug_idx" ON "live_events" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "media_pathname_idx" ON "media_assets" USING btree ("pathname");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_email_idx" ON "newsletter_subscribers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "stories_slug_idx" ON "stories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stories_status_published_idx" ON "stories" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "stories_category_idx" ON "stories" USING btree ("category_slug","published_at");--> statement-breakpoint
CREATE INDEX "story_revisions_story_idx" ON "story_revisions" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");