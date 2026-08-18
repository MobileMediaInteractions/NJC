CREATE TABLE "premium_platform_intros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"duration_ms" integer NOT NULL,
	"black_gap_ms" integer DEFAULT 2500 NOT NULL,
	"status" text DEFAULT 'inactive' NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"activated_by_clerk_id" text,
	"activated_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_platform_intros_status_check" CHECK ("premium_platform_intros"."status" in ('inactive', 'active', 'archived')),
	CONSTRAINT "premium_platform_intros_duration_check" CHECK ("premium_platform_intros"."duration_ms" > 0 and "premium_platform_intros"."black_gap_ms" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "premium_preview_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"disclaimer" text DEFAULT 'This is private preview material and may include unfinished picture, sound, music, visual effects, credits or placeholders. It may not represent the final release.' NOT NULL,
	"opens_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_preview_configuration_window_check" CHECK ("premium_preview_configurations"."expires_at" is null or "premium_preview_configurations"."opens_at" is null or "premium_preview_configurations"."expires_at" > "premium_preview_configurations"."opens_at")
);
--> statement-breakpoint
CREATE TABLE "premium_preview_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preview_id" uuid NOT NULL,
	"user_clerk_id" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"first_viewed_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"invited_by_clerk_id" text NOT NULL,
	"revoked_by_clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_preview_invitation_status_check" CHECK ("premium_preview_invitations"."status" in ('invited', 'viewing', 'viewed', 'feedback_submitted', 'revoked')),
	CONSTRAINT "premium_preview_invitation_window_check" CHECK ("premium_preview_invitations"."expires_at" is null or "premium_preview_invitations"."expires_at" > "premium_preview_invitations"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "premium_preview_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preview_id" uuid NOT NULL,
	"prompt" text NOT NULL,
	"question_type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_preview_questions_type_check" CHECK ("premium_preview_questions"."question_type" in ('rating', 'multiple_choice', 'yes_no', 'free_response'))
);
--> statement-breakpoint
CREATE TABLE "premium_preview_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"overall_rating" integer,
	"written_feedback" text DEFAULT '' NOT NULL,
	"answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_preview_response_rating_check" CHECK ("premium_preview_responses"."overall_rating" is null or "premium_preview_responses"."overall_rating" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "premium_timeline_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"segment_type" text NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"internal_name" text,
	"viewer_label" text,
	"skippable" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "premium_timeline_type_check" CHECK ("premium_timeline_segments"."segment_type" in ('intro', 'recap', 'credits', 'custom')),
	CONSTRAINT "premium_timeline_range_check" CHECK ("premium_timeline_segments"."start_ms" >= 0 and "premium_timeline_segments"."end_ms" > "premium_timeline_segments"."start_ms"),
	CONSTRAINT "premium_timeline_label_check" CHECK ("premium_timeline_segments"."segment_type" <> 'custom' or "premium_timeline_segments"."internal_name" is not null)
);
--> statement-breakpoint
ALTER TABLE "premium_content" ADD COLUMN "is_original" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "premium_content" ADD COLUMN "global_intro_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "premium_platform_intros" ADD CONSTRAINT "premium_platform_intros_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_preview_configurations" ADD CONSTRAINT "premium_preview_configurations_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_preview_invitations" ADD CONSTRAINT "premium_preview_invitations_preview_id_premium_preview_configurations_id_fk" FOREIGN KEY ("preview_id") REFERENCES "public"."premium_preview_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_preview_questions" ADD CONSTRAINT "premium_preview_questions_preview_id_premium_preview_configurations_id_fk" FOREIGN KEY ("preview_id") REFERENCES "public"."premium_preview_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_preview_responses" ADD CONSTRAINT "premium_preview_responses_invitation_id_premium_preview_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."premium_preview_invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_timeline_segments" ADD CONSTRAINT "premium_timeline_segments_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "premium_platform_intros_status_idx" ON "premium_platform_intros" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_platform_intros_one_active_idx" ON "premium_platform_intros" USING btree ("status") WHERE "premium_platform_intros"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "premium_preview_configuration_content_idx" ON "premium_preview_configurations" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "premium_preview_configuration_window_idx" ON "premium_preview_configurations" USING btree ("enabled","opens_at","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_preview_invitation_user_idx" ON "premium_preview_invitations" USING btree ("preview_id","user_clerk_id");--> statement-breakpoint
CREATE INDEX "premium_preview_invitation_access_idx" ON "premium_preview_invitations" USING btree ("user_clerk_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "premium_preview_questions_order_idx" ON "premium_preview_questions" USING btree ("preview_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_preview_response_invitation_idx" ON "premium_preview_responses" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "premium_timeline_content_order_idx" ON "premium_timeline_segments" USING btree ("content_id","start_ms","sort_order");