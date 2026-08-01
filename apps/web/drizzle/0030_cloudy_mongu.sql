CREATE TABLE "pseudonym_moderation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"previous_status" text NOT NULL,
	"next_status" text NOT NULL,
	"pseudonym_revision" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pseudonym_moderation_action_check" CHECK ("pseudonym_moderation_events"."action" in ('disable', 'restore', 'require_correction')),
	CONSTRAINT "pseudonym_moderation_previous_status_check" CHECK ("pseudonym_moderation_events"."previous_status" in ('active', 'disabled', 'correction_required')),
	CONSTRAINT "pseudonym_moderation_next_status_check" CHECK ("pseudonym_moderation_events"."next_status" in ('active', 'disabled', 'correction_required'))
);
--> statement-breakpoint
CREATE TABLE "site_configuration_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_key" text NOT NULL,
	"revision" integer NOT NULL,
	"value" jsonb NOT NULL,
	"reason" text NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"affected_platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"changed_by_clerk_id" text NOT NULL,
	"rolled_back_from_revision" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_configuration_environment_check" CHECK ("site_configuration_revisions"."environment" in ('development', 'preview', 'staging', 'production'))
);
--> statement-breakpoint
CREATE TABLE "story_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"content_version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"approved_by_id" uuid,
	"approved_by_clerk_id" text NOT NULL,
	"note" text,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_at" timestamp with time zone,
	"invalidated_by_clerk_id" text,
	"invalidation_reason" text
);
--> statement-breakpoint
CREATE TABLE "story_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"byline_mode" text DEFAULT 'account' NOT NULL,
	"added_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_authors_byline_mode_check" CHECK ("story_authors"."byline_mode" in ('account', 'pseudonym'))
);
--> statement-breakpoint
CREATE TABLE "story_publication_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"approval_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"original_scheduled_at" timestamp with time zone NOT NULL,
	"content_hash" text NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"last_error_code" text,
	"last_error_message" text,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "story_publication_jobs_status_check" CHECK ("story_publication_jobs"."status" in ('queued', 'publishing', 'published', 'cancelled', 'blocked', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "public_bylines_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "content_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "content_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_moderation_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_moderation_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_moderated_by_clerk_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_moderated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pseudonym_moderation_events" ADD CONSTRAINT "pseudonym_moderation_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_approvals" ADD CONSTRAINT "story_approvals_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_approvals" ADD CONSTRAINT "story_approvals_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_authors" ADD CONSTRAINT "story_authors_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_authors" ADD CONSTRAINT "story_authors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_publication_jobs" ADD CONSTRAINT "story_publication_jobs_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_publication_jobs" ADD CONSTRAINT "story_publication_jobs_approval_id_story_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."story_approvals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pseudonym_moderation_user_idx" ON "pseudonym_moderation_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "site_configuration_revisions_key_revision_idx" ON "site_configuration_revisions" USING btree ("setting_key","revision");--> statement-breakpoint
CREATE INDEX "site_configuration_revisions_created_idx" ON "site_configuration_revisions" USING btree ("setting_key","created_at");--> statement-breakpoint
CREATE INDEX "story_approvals_story_idx" ON "story_approvals" USING btree ("story_id","approved_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_approvals_one_active_idx" ON "story_approvals" USING btree ("story_id") WHERE "story_approvals"."invalidated_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "story_authors_story_user_idx" ON "story_authors" USING btree ("story_id","user_id");--> statement-breakpoint
CREATE INDEX "story_authors_story_position_idx" ON "story_authors" USING btree ("story_id","position");--> statement-breakpoint
CREATE INDEX "story_publication_jobs_due_idx" ON "story_publication_jobs" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_publication_jobs_one_open_idx" ON "story_publication_jobs" USING btree ("story_id") WHERE "story_publication_jobs"."status" in ('queued', 'publishing', 'blocked', 'failed');
--> statement-breakpoint
INSERT INTO "story_authors" ("story_id", "user_id", "position", "byline_mode", "added_by_clerk_id")
SELECT "id", "author_id", 0,
  CASE WHEN "public_byline_snapshot"->>'mode' = 'pseudonym' THEN 'pseudonym' ELSE 'account' END,
  'migration:0030'
FROM "stories"
WHERE "author_id" IS NOT NULL
ON CONFLICT ("story_id", "user_id") DO NOTHING;
--> statement-breakpoint
UPDATE "stories"
SET "public_bylines_snapshot" = jsonb_build_array(
  jsonb_build_object('userId', "author_id", 'mode', 'account') || COALESCE("public_byline_snapshot", "author_snapshot", '{}'::jsonb)
)
WHERE "author_id" IS NOT NULL
  AND jsonb_array_length("public_bylines_snapshot") = 0;
--> statement-breakpoint
UPDATE "stories"
SET "status" = 'review', "scheduled_at" = NULL, "updated_at" = now()
WHERE "status" = 'scheduled';
