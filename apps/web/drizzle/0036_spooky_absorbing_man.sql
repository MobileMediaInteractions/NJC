CREATE TABLE "press_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text NOT NULL,
	"source_kind" text DEFAULT 'bundled_public' NOT NULL,
	"source_path" text,
	"media_asset_id" uuid,
	"mime_type" text NOT NULL,
	"version" text DEFAULT '1' NOT NULL,
	"checksum_sha256" text,
	"visibility" text DEFAULT 'public' NOT NULL,
	"approved_usage_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attribution" text,
	"active" boolean DEFAULT true NOT NULL,
	"deprecated_at" timestamp with time zone,
	"replacement_asset_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by_clerk_id" text DEFAULT 'system' NOT NULL,
	"updated_by_clerk_id" text DEFAULT 'system' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_assets_source_check" CHECK ("press_assets"."source_kind" in ('bundled_public', 'generated_document', 'media_asset')),
	CONSTRAINT "press_assets_visibility_check" CHECK ("press_assets"."visibility" in ('public', 'restricted', 'private')),
	CONSTRAINT "press_assets_source_reference_check" CHECK (("press_assets"."source_kind" in ('bundled_public', 'generated_document') and "press_assets"."source_path" is not null and "press_assets"."media_asset_id" is null) or ("press_assets"."source_kind" = 'media_asset' and "press_assets"."source_path" is null and "press_assets"."media_asset_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "press_kit_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"actor_type" text NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_kit_audit_actor_check" CHECK ("press_kit_audit_logs"."actor_type" in ('requester', 'staff', 'system', 'ai'))
);
--> statement-breakpoint
CREATE TABLE "press_kit_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"structured_output" jsonb,
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_kit_messages_role_check" CHECK ("press_kit_messages"."role" in ('requester', 'assistant', 'system'))
);
--> statement-breakpoint
CREATE TABLE "press_kit_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"license_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"license_version" text NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"pathname" text,
	"filename" text,
	"size" integer,
	"checksum_sha256" text,
	"manifest" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"download_token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_downloaded_at" timestamp with time zone,
	"failure_code" text,
	"created_by_clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_kit_packages_status_check" CHECK ("press_kit_packages"."status" in ('generating', 'ready', 'failed', 'expired', 'revoked')),
	CONSTRAINT "press_kit_packages_size_check" CHECK ("press_kit_packages"."size" is null or "press_kit_packages"."size" > 0)
);
--> statement-breakpoint
CREATE TABLE "press_kit_request_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"decision" text DEFAULT 'requested' NOT NULL,
	"reason" text,
	"decided_by_clerk_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "press_kit_request_assets_decision_check" CHECK ("press_kit_request_assets"."decision" in ('requested', 'approved', 'rejected'))
);
--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "requester_role" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "requester_website" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "organization_website" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "project_name" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "where_used" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "expected_release_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "usage_classification" text DEFAULT 'unclassified' NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "requested_asset_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "unmatched_materials" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "structured_request" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "ai_interpretation" jsonb;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "policy_version" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "decision_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "restrictions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "license_type" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "access_token_hash" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "owner_clerk_id" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "reviewed_by_clerk_id" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "reviewer_note" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "duplicate_key" text;--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "press_assets" ADD CONSTRAINT "press_assets_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "press_kit_audit_logs" ADD CONSTRAINT "press_kit_audit_logs_request_id_press_kit_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."press_kit_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "press_kit_messages" ADD CONSTRAINT "press_kit_messages_request_id_press_kit_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."press_kit_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "press_kit_packages" ADD CONSTRAINT "press_kit_packages_request_id_press_kit_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."press_kit_requests"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "press_kit_request_assets" ADD CONSTRAINT "press_kit_request_assets_request_id_press_kit_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."press_kit_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "press_kit_request_assets" ADD CONSTRAINT "press_kit_request_assets_asset_id_press_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."press_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "press_assets_slug_idx" ON "press_assets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "press_assets_catalog_idx" ON "press_assets" USING btree ("active","category","title");--> statement-breakpoint
CREATE INDEX "press_assets_media_idx" ON "press_assets" USING btree ("media_asset_id");--> statement-breakpoint
CREATE INDEX "press_kit_audit_request_idx" ON "press_kit_audit_logs" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE INDEX "press_kit_audit_action_idx" ON "press_kit_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "press_kit_messages_request_idx" ON "press_kit_messages" USING btree ("request_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "press_kit_packages_request_idx" ON "press_kit_packages" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "press_kit_packages_license_idx" ON "press_kit_packages" USING btree ("license_id");--> statement-breakpoint
CREATE INDEX "press_kit_packages_expiry_idx" ON "press_kit_packages" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "press_kit_request_assets_unique_idx" ON "press_kit_request_assets" USING btree ("request_id","asset_id");--> statement-breakpoint
CREATE INDEX "press_kit_request_assets_decision_idx" ON "press_kit_request_assets" USING btree ("request_id","decision");--> statement-breakpoint
CREATE INDEX "press_kit_requests_owner_idx" ON "press_kit_requests" USING btree ("owner_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "press_kit_requests_duplicate_idx" ON "press_kit_requests" USING btree ("duplicate_key","created_at");--> statement-breakpoint
ALTER TABLE "press_kit_requests" ADD CONSTRAINT "press_kit_requests_status_check" CHECK ("press_kit_requests"."status" in ('generated', 'draft', 'intake', 'needs_information', 'evaluating', 'approved', 'partially_approved', 'manual_review', 'denied', 'package_generating', 'ready', 'downloaded', 'expired', 'revoked'));