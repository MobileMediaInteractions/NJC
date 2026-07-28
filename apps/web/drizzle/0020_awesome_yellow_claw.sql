CREATE TABLE "distribution_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distribution_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"processing_status" text DEFAULT 'ready' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by_clerk_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_files_positive_size_check" CHECK ("distribution_files"."size" > 0),
	CONSTRAINT "distribution_files_dimensions_check" CHECK (("distribution_files"."width" is null or "distribution_files"."width" > 0) and ("distribution_files"."height" is null or "distribution_files"."height" > 0)),
	CONSTRAINT "distribution_files_duration_check" CHECK ("distribution_files"."duration_ms" is null or "distribution_files"."duration_ms" >= 0),
	CONSTRAINT "distribution_files_processing_status_check" CHECK ("distribution_files"."processing_status" in ('pending', 'ready', 'failed', 'quarantined'))
);
--> statement-breakpoint
CREATE TABLE "distribution_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"user_clerk_id" text NOT NULL,
	"granted_by_clerk_id" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"download_allowed" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_grants_dates_check" CHECK ("distribution_grants"."expires_at" is null or "distribution_grants"."expires_at" > "distribution_grants"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "distribution_package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"file_id" uuid,
	"story_id" uuid,
	"story_snapshot" jsonb,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_package_items_single_source_check" CHECK (num_nonnulls("distribution_package_items"."file_id", "distribution_package_items"."story_id") = 1),
	CONSTRAINT "distribution_package_items_story_snapshot_check" CHECK ("distribution_package_items"."story_id" is null or "distribution_package_items"."story_snapshot" is not null)
);
--> statement-breakpoint
CREATE TABLE "distribution_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"available_at" timestamp with time zone,
	"embargo_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"download_policy" text DEFAULT 'view_only' NOT NULL,
	"terms_text" text DEFAULT '' NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_packages_status_check" CHECK ("distribution_packages"."status" in ('draft', 'available', 'expired', 'revoked', 'archived')),
	CONSTRAINT "distribution_packages_download_policy_check" CHECK ("distribution_packages"."download_policy" in ('view_only', 'grant_controlled', 'download')),
	CONSTRAINT "distribution_packages_dates_check" CHECK ("distribution_packages"."expires_at" is null or "distribution_packages"."available_at" is null or "distribution_packages"."expires_at" > "distribution_packages"."available_at")
);
--> statement-breakpoint
CREATE TABLE "distribution_playback_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"file_id" uuid NOT NULL,
	"position_ms" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_progress_values_check" CHECK ("distribution_playback_progress"."position_ms" >= 0 and "distribution_playback_progress"."duration_ms" >= 0 and ("distribution_playback_progress"."duration_ms" = 0 or "distribution_playback_progress"."position_ms" <= "distribution_playback_progress"."duration_ms"))
);
--> statement-breakpoint
CREATE TABLE "distribution_user_library" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"item_id" uuid NOT NULL,
	"collection" text DEFAULT 'Saved' NOT NULL,
	"favorite" boolean DEFAULT false NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distribution_user_library_collection_check" CHECK (length(btrim("distribution_user_library"."collection")) > 0)
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "public_byline_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_normalized" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pseudonym_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "distribution_grants" ADD CONSTRAINT "distribution_grants_package_id_distribution_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."distribution_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_package_items" ADD CONSTRAINT "distribution_package_items_package_id_distribution_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."distribution_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_package_items" ADD CONSTRAINT "distribution_package_items_file_id_distribution_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."distribution_files"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_package_items" ADD CONSTRAINT "distribution_package_items_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_playback_progress" ADD CONSTRAINT "distribution_playback_progress_file_id_distribution_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."distribution_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_user_library" ADD CONSTRAINT "distribution_user_library_item_id_distribution_package_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."distribution_package_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "distribution_audit_actor_idx" ON "distribution_audit_logs" USING btree ("actor_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "distribution_audit_target_idx" ON "distribution_audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_files_pathname_idx" ON "distribution_files" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "distribution_files_type_size_idx" ON "distribution_files" USING btree ("mime_type","size");--> statement-breakpoint
CREATE INDEX "distribution_files_created_idx" ON "distribution_files" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_grants_package_user_idx" ON "distribution_grants" USING btree ("package_id","user_clerk_id");--> statement-breakpoint
CREATE INDEX "distribution_grants_user_active_idx" ON "distribution_grants" USING btree ("user_clerk_id","revoked_at","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_package_asset_idx" ON "distribution_package_items" USING btree ("package_id","file_id");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_package_story_idx" ON "distribution_package_items" USING btree ("package_id","story_id");--> statement-breakpoint
CREATE INDEX "distribution_package_items_order_idx" ON "distribution_package_items" USING btree ("package_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_packages_slug_idx" ON "distribution_packages" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "distribution_packages_status_idx" ON "distribution_packages" USING btree ("status","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_progress_user_file_idx" ON "distribution_playback_progress" USING btree ("user_clerk_id","file_id");--> statement-breakpoint
CREATE INDEX "distribution_progress_updated_idx" ON "distribution_playback_progress" USING btree ("user_clerk_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "distribution_user_library_user_item_idx" ON "distribution_user_library" USING btree ("user_clerk_id","item_id");--> statement-breakpoint
CREATE INDEX "distribution_user_library_collection_idx" ON "distribution_user_library" USING btree ("user_clerk_id","collection");--> statement-breakpoint
CREATE UNIQUE INDEX "users_pseudonym_normalized_idx" ON "users" USING btree ("pseudonym_normalized") WHERE "users"."pseudonym_normalized" is not null;