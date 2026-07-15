CREATE TABLE "press_kit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"organization" text NOT NULL,
	"email" text NOT NULL,
	"intended_use" text NOT NULL,
	"request_details" text NOT NULL,
	"asset_groups" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"archive_bytes" integer,
	"generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "press_kit_requests_status_idx" ON "press_kit_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "press_kit_requests_email_idx" ON "press_kit_requests" USING btree ("email","created_at");