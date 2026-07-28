CREATE TABLE "legal_center_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity" text DEFAULT 'informational' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"verification_checks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"submitted_by_clerk_id" text,
	"approved_by_clerk_id" text,
	"published_revision" integer DEFAULT 0 NOT NULL,
	"published_snapshot" jsonb,
	"review_requested_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "legal_center_entries_severity_check" CHECK ("legal_center_entries"."severity" in ('informational', 'material', 'critical')),
	CONSTRAINT "legal_center_entries_status_check" CHECK ("legal_center_entries"."status" in ('draft', 'review', 'published')),
	CONSTRAINT "legal_center_entries_revision_check" CHECK ("legal_center_entries"."published_revision" >= 0),
	CONSTRAINT "legal_center_entries_second_approval_check" CHECK ("legal_center_entries"."severity" <> 'critical' or "legal_center_entries"."approved_by_clerk_id" is null or "legal_center_entries"."approved_by_clerk_id" <> "legal_center_entries"."submitted_by_clerk_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "legal_center_entries_slug_idx" ON "legal_center_entries" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "legal_center_entries_status_order_idx" ON "legal_center_entries" USING btree ("status","sort_order");