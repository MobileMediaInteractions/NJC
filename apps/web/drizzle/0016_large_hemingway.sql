CREATE TABLE "access_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"amount" integer NOT NULL,
	"transaction_type" text NOT NULL,
	"reason" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"reversal_of_id" uuid,
	"idempotency_key" text,
	"expires_at" timestamp with time zone,
	"created_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_credit_redemption_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"cost_credits" integer NOT NULL,
	"benefit_type" text NOT NULL,
	"benefit_value" integer,
	"tier_id" uuid,
	"content_id" uuid,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_credit_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"rule_id" uuid NOT NULL,
	"ledger_transaction_id" uuid NOT NULL,
	"entitlement_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"key" text PRIMARY KEY NOT NULL,
	"parent_key" text,
	"enabled" boolean DEFAULT false NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_clerk_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_asset_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"product" text DEFAULT 'courier' NOT NULL,
	"owner_type" text NOT NULL,
	"owner_id" text NOT NULL,
	"field" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_comment_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"reporter_clerk_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"reviewed_by_clerk_id" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_clerk_id" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"eyebrow" text DEFAULT 'NJC+' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parent_id" uuid,
	"season_number" integer,
	"episode_number" integer,
	"duration_ms" integer,
	"image_asset_id" uuid,
	"image_url" text,
	"image_alt" text,
	"media_asset_id" uuid,
	"media_url" text,
	"media_mime_type" text,
	"captions_url" text,
	"transcript" text,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"speakers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"paywall_policy" text DEFAULT 'njc_plus' NOT NULL,
	"required_tier_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preview_seconds" integer DEFAULT 0 NOT NULL,
	"rental_hours" integer,
	"comments_enabled" boolean DEFAULT false NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"is_breaking" boolean DEFAULT false NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"social_image_url" text,
	"no_index" boolean DEFAULT false NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_content_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_content_id" uuid NOT NULL,
	"target_content_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"note" text,
	"editor_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_homepage_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_type" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"eyebrow" text DEFAULT '' NOT NULL,
	"content_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"updated_by_clerk_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"tier_id" uuid NOT NULL,
	"kind" text DEFAULT 'trial' NOT NULL,
	"name" text NOT NULL,
	"promotional_text" text DEFAULT '' NOT NULL,
	"price_cents" integer DEFAULT 100 NOT NULL,
	"duration_days" integer DEFAULT 3 NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"per_user_limit" integer DEFAULT 1 NOT NULL,
	"payment_required" boolean DEFAULT true NOT NULL,
	"auto_renews" boolean DEFAULT true NOT NULL,
	"renewal_price_cents" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"provider_price_id" text,
	"eligibility" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_playback_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"content_id" uuid NOT NULL,
	"position_ms" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"device_platform" text DEFAULT 'web' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"tier_id" uuid NOT NULL,
	"offer_id" uuid,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"current_period_starts_at" timestamp with time zone,
	"current_period_ends_at" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"interval" text DEFAULT 'month' NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trial_eligible" boolean DEFAULT false NOT NULL,
	"access_credit_eligible" boolean DEFAULT false NOT NULL,
	"available" boolean DEFAULT false NOT NULL,
	"visible" boolean DEFAULT false NOT NULL,
	"provider_price_id" text,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "copyright" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "license" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "source" text DEFAULT 'studio' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "extension" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "sha256" text;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "processing_status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "uploaded_by_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "access_credit_redemption_rules" ADD CONSTRAINT "access_credit_redemption_rules_tier_id_premium_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."premium_tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_credit_redemption_rules" ADD CONSTRAINT "access_credit_redemption_rules_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_credit_redemptions" ADD CONSTRAINT "access_credit_redemptions_rule_id_access_credit_redemption_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."access_credit_redemption_rules"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_credit_redemptions" ADD CONSTRAINT "access_credit_redemptions_ledger_transaction_id_access_credit_ledger_id_fk" FOREIGN KEY ("ledger_transaction_id") REFERENCES "public"."access_credit_ledger"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_credit_redemptions" ADD CONSTRAINT "access_credit_redemptions_entitlement_id_premium_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "public"."premium_entitlements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_asset_usages" ADD CONSTRAINT "media_asset_usages_asset_id_media_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."media_assets"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_comment_reports" ADD CONSTRAINT "premium_comment_reports_comment_id_premium_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."premium_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_comments" ADD CONSTRAINT "premium_comments_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_content" ADD CONSTRAINT "premium_content_image_asset_id_media_assets_id_fk" FOREIGN KEY ("image_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_content" ADD CONSTRAINT "premium_content_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_content_relations" ADD CONSTRAINT "premium_content_relations_source_content_id_premium_content_id_fk" FOREIGN KEY ("source_content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_content_relations" ADD CONSTRAINT "premium_content_relations_target_content_id_premium_content_id_fk" FOREIGN KEY ("target_content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_content_revisions" ADD CONSTRAINT "premium_content_revisions_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_offers" ADD CONSTRAINT "premium_offers_tier_id_premium_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."premium_tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_playback_progress" ADD CONSTRAINT "premium_playback_progress_content_id_premium_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."premium_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_subscriptions" ADD CONSTRAINT "premium_subscriptions_tier_id_premium_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."premium_tiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_subscriptions" ADD CONSTRAINT "premium_subscriptions_offer_id_premium_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."premium_offers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_credit_ledger_user_idx" ON "access_credit_ledger" USING btree ("user_clerk_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "access_credit_ledger_idempotency_idx" ON "access_credit_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "access_credit_rules_active_idx" ON "access_credit_redemption_rules" USING btree ("active","cost_credits");--> statement-breakpoint
CREATE UNIQUE INDEX "access_credit_redemptions_idempotency_idx" ON "access_credit_redemptions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "access_credit_redemptions_user_idx" ON "access_credit_redemptions" USING btree ("user_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "feature_flags_parent_idx" ON "feature_flags" USING btree ("parent_key");--> statement-breakpoint
CREATE UNIQUE INDEX "media_asset_usage_unique_idx" ON "media_asset_usages" USING btree ("asset_id","product","owner_type","owner_id","field");--> statement-breakpoint
CREATE INDEX "media_asset_usage_owner_idx" ON "media_asset_usages" USING btree ("product","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "premium_audit_target_idx" ON "premium_audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "premium_audit_actor_idx" ON "premium_audit_logs" USING btree ("actor_clerk_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_comment_reports_reporter_idx" ON "premium_comment_reports" USING btree ("comment_id","reporter_clerk_id");--> statement-breakpoint
CREATE INDEX "premium_comment_reports_status_idx" ON "premium_comment_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "premium_comments_content_status_idx" ON "premium_comments" USING btree ("content_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_content_slug_idx" ON "premium_content" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "premium_content_status_published_idx" ON "premium_content" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "premium_content_kind_published_idx" ON "premium_content" USING btree ("kind","published_at");--> statement-breakpoint
CREATE INDEX "premium_content_parent_idx" ON "premium_content" USING btree ("parent_id","season_number","episode_number");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_content_relation_unique_idx" ON "premium_content_relations" USING btree ("source_content_id","target_content_id","relation_type");--> statement-breakpoint
CREATE INDEX "premium_content_relation_target_idx" ON "premium_content_relations" USING btree ("target_content_id","relation_type");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_content_revision_unique_idx" ON "premium_content_revisions" USING btree ("content_id","version");--> statement-breakpoint
CREATE INDEX "premium_entitlements_user_active_idx" ON "premium_entitlements" USING btree ("user_clerk_id","status","ends_at");--> statement-breakpoint
CREATE INDEX "premium_entitlements_scope_idx" ON "premium_entitlements" USING btree ("scope_type","scope_id","status");--> statement-breakpoint
CREATE INDEX "premium_homepage_order_idx" ON "premium_homepage_modules" USING btree ("enabled","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_offers_slug_idx" ON "premium_offers" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_playback_progress_user_content_idx" ON "premium_playback_progress" USING btree ("user_clerk_id","content_id");--> statement-breakpoint
CREATE INDEX "premium_playback_progress_user_updated_idx" ON "premium_playback_progress" USING btree ("user_clerk_id","updated_at");--> statement-breakpoint
CREATE INDEX "premium_subscriptions_user_status_idx" ON "premium_subscriptions" USING btree ("user_clerk_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_subscriptions_provider_idx" ON "premium_subscriptions" USING btree ("provider","provider_subscription_id");--> statement-breakpoint
CREATE UNIQUE INDEX "premium_tiers_slug_idx" ON "premium_tiers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "media_type_created_idx" ON "media_assets" USING btree ("mime_type","created_at");--> statement-breakpoint
CREATE INDEX "media_deleted_created_idx" ON "media_assets" USING btree ("deleted_at","created_at");--> statement-breakpoint
CREATE INDEX "media_sha256_idx" ON "media_assets" USING btree ("sha256");