ALTER TABLE "device_pairing_requests" ADD COLUMN "claim_nonce_hash" text DEFAULT 'legacy-expired' NOT NULL;--> statement-breakpoint
ALTER TABLE "device_pairing_requests" ALTER COLUMN "claim_nonce_hash" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "device_pairing_requests" ADD COLUMN "claimed_by_clerk_id" text;--> statement-breakpoint
ALTER TABLE "device_pairing_requests" ADD COLUMN "claimed_by_name" text;--> statement-breakpoint
ALTER TABLE "device_pairing_requests" ADD COLUMN "scan_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "device_pairing_requests" ADD COLUMN "processing_expires_at" timestamp with time zone;--> statement-breakpoint
UPDATE "device_pairing_requests" SET "status" = 'expired' WHERE "status" IN ('pending', 'processing');
