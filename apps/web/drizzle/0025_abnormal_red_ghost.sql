CREATE TABLE "notification_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"destination" text DEFAULT '/' NOT NULL,
	"audience_type" text NOT NULL,
	"audience_spec" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'sending' NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"subscription_count" integer DEFAULT 0 NOT NULL,
	"accepted_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "notification_campaigns_audience_type_check" CHECK ("notification_campaigns"."audience_type" in ('sitewide', 'accounts', 'staff_roles', 'njc_plus_segment')),
	CONSTRAINT "notification_campaigns_status_check" CHECK ("notification_campaigns"."status" in ('sending', 'completed', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"recipient_clerk_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_status" integer,
	"error_code" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_status_check" CHECK ("notification_deliveries"."status" in ('pending', 'accepted', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "web_push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_clerk_id" text,
	"user_agent_family" text,
	"locale" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_campaign_id_notification_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."notification_campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_subscription_id_web_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."web_push_subscriptions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_campaigns_created_idx" ON "notification_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notification_campaigns_actor_idx" ON "notification_campaigns" USING btree ("created_by_clerk_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_campaign_subscription_idx" ON "notification_deliveries" USING btree ("campaign_id","subscription_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_campaign_status_idx" ON "notification_deliveries" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "notification_deliveries_recipient_idx" ON "notification_deliveries" USING btree ("recipient_clerk_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "web_push_subscriptions_endpoint_idx" ON "web_push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "web_push_subscriptions_user_idx" ON "web_push_subscriptions" USING btree ("user_clerk_id","is_active");--> statement-breakpoint
CREATE INDEX "web_push_subscriptions_active_idx" ON "web_push_subscriptions" USING btree ("is_active","last_seen_at");