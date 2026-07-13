CREATE TABLE "device_pairing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" text NOT NULL,
	"device_name" text NOT NULL,
	"device_secret_hash" text NOT NULL,
	"user_code_hash" text NOT NULL,
	"requester_ip_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approval_attempts" integer DEFAULT 0 NOT NULL,
	"approved_by_clerk_id" text,
	"approved_by_name" text,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"user_clerk_id" text NOT NULL,
	"display_name" text NOT NULL,
	"platform" text NOT NULL,
	"device_name" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "device_pairing_ip_created_idx" ON "device_pairing_requests" USING btree ("requester_ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "device_pairing_status_expires_idx" ON "device_pairing_requests" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "device_sessions_token_idx" ON "device_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "device_sessions_user_idx" ON "device_sessions" USING btree ("user_clerk_id","created_at");