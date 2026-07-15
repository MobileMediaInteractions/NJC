ALTER TABLE "stories" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "no_index" boolean DEFAULT false NOT NULL;