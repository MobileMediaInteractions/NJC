ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_slug" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "public_profile_published_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "users_public_slug_idx" ON "users" USING btree ("public_slug");