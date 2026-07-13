CREATE TABLE "audience_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" text NOT NULL,
	"platform" text NOT NULL,
	"source" text DEFAULT 'unknown' NOT NULL,
	"app_version" text,
	"user_clerk_id" text,
	"event_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "audience_installations_installation_idx" ON "audience_installations" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "audience_installations_platform_seen_idx" ON "audience_installations" USING btree ("platform","last_seen_at");--> statement-breakpoint
CREATE INDEX "audience_installations_user_idx" ON "audience_installations" USING btree ("user_clerk_id");