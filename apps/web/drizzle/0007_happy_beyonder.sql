CREATE TYPE "public"."employee_access_request_status" AS ENUM('pending', 'approved', 'denied', 'cancelled', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."employee_channel_kind" AS ENUM('public', 'private', 'direct', 'group');--> statement-breakpoint
CREATE TABLE "employee_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_clerk_id" text NOT NULL,
	"requester_email" text NOT NULL,
	"capability" text NOT NULL,
	"source_app" text DEFAULT 'reader' NOT NULL,
	"intended_destination" text,
	"reason" text,
	"status" "employee_access_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_clerk_id" text,
	"reviewer_note" text,
	"reviewed_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_clerk_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_capability_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_clerk_id" text NOT NULL,
	"capability" text NOT NULL,
	"effect" text DEFAULT 'allow' NOT NULL,
	"granted_by_clerk_id" text NOT NULL,
	"reason" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_chat_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"message_id" uuid,
	"uploader_clerk_id" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_chat_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "employee_channel_kind" DEFAULT 'public' NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"topic" text,
	"conversation_key" text,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_chat_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_clerk_id" text NOT NULL,
	"membership_role" text DEFAULT 'member' NOT NULL,
	"last_read_at" timestamp with time zone,
	"muted_until" timestamp with time zone,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_clerk_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"reply_to_id" uuid,
	"mentions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"deleted_by_clerk_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_chat_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"reporter_clerk_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_clerk_id" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_clerk_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"destination" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_presence" (
	"user_clerk_id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"typing_channel_id" uuid,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"typing_expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employee_push_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_clerk_id" text NOT NULL,
	"platform" text NOT NULL,
	"app_version" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_chat_attachments" ADD CONSTRAINT "employee_chat_attachments_channel_id_employee_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."employee_chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_chat_attachments" ADD CONSTRAINT "employee_chat_attachments_message_id_employee_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."employee_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_chat_members" ADD CONSTRAINT "employee_chat_members_channel_id_employee_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."employee_chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_chat_messages" ADD CONSTRAINT "employee_chat_messages_channel_id_employee_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."employee_chat_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_chat_reports" ADD CONSTRAINT "employee_chat_reports_message_id_employee_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."employee_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_presence" ADD CONSTRAINT "employee_presence_typing_channel_id_employee_chat_channels_id_fk" FOREIGN KEY ("typing_channel_id") REFERENCES "public"."employee_chat_channels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_access_requests_requester_idx" ON "employee_access_requests" USING btree ("requester_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_access_requests_review_idx" ON "employee_access_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "employee_audit_actor_idx" ON "employee_audit_logs" USING btree ("actor_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_audit_action_idx" ON "employee_audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "employee_capability_grants_user_idx" ON "employee_capability_grants" USING btree ("user_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_capability_grants_active_idx" ON "employee_capability_grants" USING btree ("user_clerk_id","capability","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_chat_attachments_path_idx" ON "employee_chat_attachments" USING btree ("pathname");--> statement-breakpoint
CREATE INDEX "employee_chat_attachments_message_idx" ON "employee_chat_attachments" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_chat_channels_slug_idx" ON "employee_chat_channels" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_chat_channels_conversation_idx" ON "employee_chat_channels" USING btree ("conversation_key");--> statement-breakpoint
CREATE INDEX "employee_chat_channels_kind_idx" ON "employee_chat_channels" USING btree ("kind","is_archived");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_chat_members_channel_user_idx" ON "employee_chat_members" USING btree ("channel_id","user_clerk_id");--> statement-breakpoint
CREATE INDEX "employee_chat_members_user_idx" ON "employee_chat_members" USING btree ("user_clerk_id","left_at");--> statement-breakpoint
CREATE INDEX "employee_chat_messages_channel_cursor_idx" ON "employee_chat_messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_chat_messages_author_idx" ON "employee_chat_messages" USING btree ("author_clerk_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_chat_reports_message_reporter_idx" ON "employee_chat_reports" USING btree ("message_id","reporter_clerk_id");--> statement-breakpoint
CREATE INDEX "employee_chat_reports_status_idx" ON "employee_chat_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "employee_notifications_recipient_idx" ON "employee_notifications" USING btree ("recipient_clerk_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_notifications_unread_idx" ON "employee_notifications" USING btree ("recipient_clerk_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_push_devices_token_idx" ON "employee_push_devices" USING btree ("token");--> statement-breakpoint
CREATE INDEX "employee_push_devices_user_idx" ON "employee_push_devices" USING btree ("user_clerk_id","is_active");