CREATE TABLE "premium_beta_tester_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"feature_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"premium_content_included" boolean DEFAULT false NOT NULL,
	"content_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"show_member_branding" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"paused_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"invited_by_clerk_id" text NOT NULL,
	"revoked_by_clerk_id" text,
	"reason" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "premium_beta_tester_user_status_idx" ON "premium_beta_tester_grants" USING btree ("user_clerk_id","status","ends_at");--> statement-breakpoint
CREATE INDEX "premium_beta_tester_active_window_idx" ON "premium_beta_tester_grants" USING btree ("status","starts_at","ends_at");