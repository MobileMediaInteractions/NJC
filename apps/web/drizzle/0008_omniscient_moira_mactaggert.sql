CREATE TYPE "public"."platform_environment" AS ENUM('development', 'preview', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."platform_license_kind" AS ENUM('commercial', 'trial', 'development', 'first_party');--> statement-breakpoint
CREATE TYPE "public"."platform_license_status" AS ENUM('active', 'suspended', 'revoked', 'expired');--> statement-breakpoint
CREATE TABLE "platform_activations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_application_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"environment" "platform_environment" NOT NULL,
	"build_id" text NOT NULL,
	"bundle_or_package_id" text,
	"signing_identity" text,
	"host" text,
	"attestation_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"external_id" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_feature_modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" text NOT NULL,
	"version" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"checksum" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"request_hash" text NOT NULL,
	"response" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"application_identity_id" uuid NOT NULL,
	"pseudonymous_device_id_hash" text NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_license_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_license_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"application_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"kind" "platform_license_kind" NOT NULL,
	"status" "platform_license_status" DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"key_prefix" text,
	"key_hash" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"suspended_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_offline_leases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"installation_id" uuid NOT NULL,
	"key_id" text NOT NULL,
	"receipt_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"grace_ends_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_plan_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"feature_id" text NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"seat_limit" integer DEFAULT 1 NOT NULL,
	"device_limit" integer DEFAULT 1 NOT NULL,
	"online_lease_seconds" integer DEFAULT 3600 NOT NULL,
	"offline_lease_seconds" integer DEFAULT 86400 NOT NULL,
	"grace_seconds" integer DEFAULT 300 NOT NULL,
	"usage_limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"assignee_id" text,
	"transferred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_signing_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"algorithm" text DEFAULT 'Ed25519' NOT NULL,
	"public_key_pem" text NOT NULL,
	"private_key_reference" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "platform_usage_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installation_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"counters" jsonb NOT NULL,
	"signature" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret_reference" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_activations" ADD CONSTRAINT "platform_activations_license_id_platform_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."platform_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_activations" ADD CONSTRAINT "platform_activations_installation_id_platform_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."platform_installations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_application_identities" ADD CONSTRAINT "platform_application_identities_application_id_platform_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."platform_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_applications" ADD CONSTRAINT "platform_applications_organization_id_platform_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."platform_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_applications" ADD CONSTRAINT "platform_applications_product_id_platform_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."platform_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_customers" ADD CONSTRAINT "platform_customers_organization_id_platform_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."platform_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_installations" ADD CONSTRAINT "platform_installations_license_id_platform_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."platform_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_installations" ADD CONSTRAINT "platform_installations_application_identity_id_platform_application_identities_id_fk" FOREIGN KEY ("application_identity_id") REFERENCES "public"."platform_application_identities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_license_versions" ADD CONSTRAINT "platform_license_versions_license_id_platform_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."platform_licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_licenses" ADD CONSTRAINT "platform_licenses_organization_id_platform_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."platform_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_licenses" ADD CONSTRAINT "platform_licenses_customer_id_platform_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."platform_customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_licenses" ADD CONSTRAINT "platform_licenses_product_id_platform_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."platform_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_licenses" ADD CONSTRAINT "platform_licenses_application_id_platform_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."platform_applications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_licenses" ADD CONSTRAINT "platform_licenses_plan_id_platform_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_offline_leases" ADD CONSTRAINT "platform_offline_leases_license_id_platform_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."platform_licenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_offline_leases" ADD CONSTRAINT "platform_offline_leases_installation_id_platform_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."platform_installations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_plan_entitlements" ADD CONSTRAINT "platform_plan_entitlements_plan_id_platform_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_plans" ADD CONSTRAINT "platform_plans_product_id_platform_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."platform_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_seats" ADD CONSTRAINT "platform_seats_license_id_platform_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."platform_licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_usage_reports" ADD CONSTRAINT "platform_usage_reports_installation_id_platform_installations_id_fk" FOREIGN KEY ("installation_id") REFERENCES "public"."platform_installations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_webhooks" ADD CONSTRAINT "platform_webhooks_organization_id_platform_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."platform_organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "platform_activations_license_idx" ON "platform_activations" USING btree ("license_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_app_identity_unique_idx" ON "platform_application_identities" USING btree ("application_id","platform","environment","build_id");--> statement-breakpoint
CREATE INDEX "platform_applications_org_idx" ON "platform_applications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "platform_customers_org_idx" ON "platform_customers" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_feature_modules_id_version_idx" ON "platform_feature_modules" USING btree ("feature_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_idempotency_scope_key_idx" ON "platform_idempotency_records" USING btree ("scope","key");--> statement-breakpoint
CREATE INDEX "platform_idempotency_expiry_idx" ON "platform_idempotency_records" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "platform_installations_license_idx" ON "platform_installations" USING btree ("license_id","deactivated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_installations_device_idx" ON "platform_installations" USING btree ("license_id","pseudonymous_device_id_hash");--> statement-breakpoint
CREATE INDEX "platform_license_audit_target_idx" ON "platform_license_audit" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_license_versions_unique_idx" ON "platform_license_versions" USING btree ("license_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_licenses_key_prefix_idx" ON "platform_licenses" USING btree ("key_prefix");--> statement-breakpoint
CREATE INDEX "platform_licenses_org_idx" ON "platform_licenses" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "platform_offline_leases_install_idx" ON "platform_offline_leases" USING btree ("installation_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_plan_entitlements_unique_idx" ON "platform_plan_entitlements" USING btree ("plan_id","feature_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_plans_product_slug_idx" ON "platform_plans" USING btree ("product_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_products_slug_idx" ON "platform_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "platform_seats_license_idx" ON "platform_seats" USING btree ("license_id");--> statement-breakpoint
CREATE UNIQUE INDEX "platform_usage_reports_period_idx" ON "platform_usage_reports" USING btree ("installation_id","period_start","period_end");