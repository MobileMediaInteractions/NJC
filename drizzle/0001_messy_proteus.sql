CREATE TABLE "news_tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "news_tips_status_idx" ON "news_tips" USING btree ("status","created_at");