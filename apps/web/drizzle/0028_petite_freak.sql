ALTER TABLE "financial_settings" ADD COLUMN "target_monthly_page_views" integer DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settings" ADD COLUMN "modeled_advertising_rpm_cents" integer DEFAULT 800 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settings" ADD COLUMN "target_paid_members" integer DEFAULT 250 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settings" ADD COLUMN "modeled_member_revenue_cents" integer DEFAULT 999 NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settings" ADD COLUMN "monthly_sponsorship_target_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "editing_closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD COLUMN "review_status" text DEFAULT 'applied' NOT NULL;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD COLUMN "base_version" integer;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD COLUMN "reviewed_by_id" uuid;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "story_revisions" ADD CONSTRAINT "story_revisions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_revisions_review_queue_idx" ON "story_revisions" USING btree ("story_id","review_status","created_at");--> statement-breakpoint
ALTER TABLE "financial_settings" ADD CONSTRAINT "financial_settings_opportunity_model_check" CHECK ("financial_settings"."target_monthly_page_views" between 0 and 1000000000
        and "financial_settings"."modeled_advertising_rpm_cents" between 0 and 1000000
        and "financial_settings"."target_paid_members" between 0 and 10000000
        and "financial_settings"."modeled_member_revenue_cents" between 0 and 100000000
        and "financial_settings"."monthly_sponsorship_target_cents" between 0 and 100000000000);--> statement-breakpoint
ALTER TABLE "story_revisions" ADD CONSTRAINT "story_revisions_review_status_check" CHECK ("story_revisions"."review_status" in ('applied', 'pending', 'rejected', 'superseded'));--> statement-breakpoint
UPDATE "financial_settings"
SET
  "legal_entity_name" = CASE
    WHEN btrim("legal_entity_name") = '' THEN 'The New Jersey Courier — working reporting identity (legal entity unverified)'
    ELSE "legal_entity_name"
  END,
  "notes" = CASE
    WHEN btrim("notes") = '' THEN 'UNREVIEWED NEW JERSEY STARTER POLICY
Confirm the registered legal entity, federal tax classification, NJ-REG status, employer status and whether each NJC+ offering qualifies as an exempt newspaper or periodical before entering tax reserve rates. New Jersey corporation tax rates vary by entity and taxable income; payroll withholding and employer contributions vary by workforce facts. Publication exemptions do not automatically cover every premium product, event, advertisement or service.
Official references: NJ Division of Revenue business registration; NJ Division of Taxation corporation filing responsibilities; NJ ANJ-21 newspapers and periodicals; NJ employer payroll tax; IRS business taxes and estimated taxes.'
    ELSE "notes"
  END,
  "updated_at" = now()
WHERE "tax_policy_reviewed_at" IS NULL
  AND (btrim("legal_entity_name") = '' OR btrim("notes") = '');
