CREATE TABLE "financial_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"entry_kind" text NOT NULL,
	"revenue_category" text DEFAULT 'other' NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"gross_amount_cents" integer DEFAULT 0 NOT NULL,
	"fee_amount_cents" integer DEFAULT 0 NOT NULL,
	"tax_amount_cents" integer DEFAULT 0 NOT NULL,
	"net_amount_cents" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'posted' NOT NULL,
	"description" text NOT NULL,
	"counterparty" text,
	"user_clerk_id" text,
	"provider_customer_id" text,
	"provider_object_id" text,
	"provider_balance_transaction_id" text,
	"provider_payout_id" text,
	"provider_event_id" text,
	"idempotency_key" text NOT NULL,
	"reversal_of_id" uuid,
	"available_on" timestamp with time zone,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_by_clerk_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_ledger_source_check" CHECK ("financial_ledger_entries"."source" in ('stripe', 'manual', 'import', 'system')),
	CONSTRAINT "financial_ledger_kind_check" CHECK ("financial_ledger_entries"."entry_kind" in (
        'payment', 'refund', 'dispute', 'dispute_reversal', 'fee',
        'payout', 'tax_payment', 'expense', 'income', 'adjustment', 'reversal'
      )),
	CONSTRAINT "financial_ledger_status_check" CHECK ("financial_ledger_entries"."status" in ('pending', 'available', 'posted', 'failed', 'void'))
);
--> statement-breakpoint
CREATE TABLE "financial_period_closes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_type" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'closed' NOT NULL,
	"snapshot" jsonb NOT NULL,
	"reconciliation_status" text DEFAULT 'unreviewed' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"supersedes_id" uuid,
	"closed_by_clerk_id" text NOT NULL,
	"reviewed_by_clerk_id" text,
	"closed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_period_close_type_check" CHECK ("financial_period_closes"."period_type" in ('month', 'quarter', 'year')),
	CONSTRAINT "financial_period_close_status_check" CHECK ("financial_period_closes"."status" in ('closed', 'superseded')),
	CONSTRAINT "financial_period_close_reconciliation_check" CHECK ("financial_period_closes"."reconciliation_status" in ('unreviewed', 'reviewed', 'exception')),
	CONSTRAINT "financial_period_close_dates_check" CHECK ("financial_period_closes"."period_end" > "financial_period_closes"."period_start" and "financial_period_closes"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "financial_provider_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"provider_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"provider_object_id" text,
	"livemode" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"last_error_code" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_provider_events_status_check" CHECK ("financial_provider_events"."status" in ('processing', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "financial_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"singleton_key" text DEFAULT 'primary' NOT NULL,
	"legal_entity_name" text DEFAULT '' NOT NULL,
	"reporting_currency" text DEFAULT 'usd' NOT NULL,
	"fiscal_year_start_month" integer DEFAULT 1 NOT NULL,
	"federal_income_tax_reserve_bps" integer DEFAULT 0 NOT NULL,
	"state_income_tax_reserve_bps" integer DEFAULT 0 NOT NULL,
	"payroll_tax_reserve_bps" integer DEFAULT 0 NOT NULL,
	"contingency_reserve_bps" integer DEFAULT 0 NOT NULL,
	"chargeback_reserve_bps" integer DEFAULT 0 NOT NULL,
	"operating_reserve_months" integer DEFAULT 0 NOT NULL,
	"monthly_operating_budget_cents" integer DEFAULT 0 NOT NULL,
	"tax_policy_reviewed_at" timestamp with time zone,
	"tax_policy_reviewed_by" text,
	"notes" text DEFAULT '' NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_settings_fiscal_month_check" CHECK ("financial_settings"."fiscal_year_start_month" between 1 and 12),
	CONSTRAINT "financial_settings_reserve_rates_check" CHECK ("financial_settings"."federal_income_tax_reserve_bps" between 0 and 10000
        and "financial_settings"."state_income_tax_reserve_bps" between 0 and 10000
        and "financial_settings"."payroll_tax_reserve_bps" between 0 and 10000
        and "financial_settings"."contingency_reserve_bps" between 0 and 10000
        and "financial_settings"."chargeback_reserve_bps" between 0 and 10000),
	CONSTRAINT "financial_settings_operating_reserve_check" CHECK ("financial_settings"."operating_reserve_months" between 0 and 36
        and "financial_settings"."monthly_operating_budget_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "financial_ledger_idempotency_idx" ON "financial_ledger_entries" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_ledger_balance_transaction_idx" ON "financial_ledger_entries" USING btree ("provider_balance_transaction_id");--> statement-breakpoint
CREATE INDEX "financial_ledger_occurred_idx" ON "financial_ledger_entries" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "financial_ledger_kind_occurred_idx" ON "financial_ledger_entries" USING btree ("entry_kind","occurred_at");--> statement-breakpoint
CREATE INDEX "financial_ledger_category_occurred_idx" ON "financial_ledger_entries" USING btree ("revenue_category","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_period_close_version_idx" ON "financial_period_closes" USING btree ("period_type","period_start","period_end","version");--> statement-breakpoint
CREATE INDEX "financial_period_close_status_idx" ON "financial_period_closes" USING btree ("status","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_provider_events_provider_idx" ON "financial_provider_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "financial_provider_events_status_idx" ON "financial_provider_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_settings_singleton_idx" ON "financial_settings" USING btree ("singleton_key");