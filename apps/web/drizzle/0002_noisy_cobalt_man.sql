CREATE TABLE "api_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_key_id" uuid,
	"actor_clerk_id" text,
	"event" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_clerk_id" text NOT NULL,
	"owner_email" text NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rate_limit_minute" integer DEFAULT 60 NOT NULL,
	"rate_limit_day" integer DEFAULT 10000 NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text,
	"email" text NOT NULL,
	"request_type" text NOT NULL,
	"jurisdiction" text,
	"status" text DEFAULT 'received' NOT NULL,
	"verification_token_hash" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "portable_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blob_url" text NOT NULL,
	"pathname" text NOT NULL,
	"checksum_sha256" text NOT NULL,
	"size" integer NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"user_clerk_id" text,
	"device_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by_clerk_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_audit_logs" ADD CONSTRAINT "api_audit_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_audit_event_idx" ON "api_audit_logs" USING btree ("event","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefix_idx" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "api_keys_owner_idx" ON "api_keys" USING btree ("owner_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "data_requests_email_idx" ON "data_requests" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "portable_exports_created_idx" ON "portable_exports" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_devices_token_idx" ON "push_devices" USING btree ("token");