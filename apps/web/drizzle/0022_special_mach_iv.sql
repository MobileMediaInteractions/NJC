CREATE TABLE "twenty_under_twenty_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"title" text DEFAULT '20 Under 20' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"eligibility_summary" text DEFAULT 'New Jersey high school students under 20' NOT NULL,
	"age_limit" integer DEFAULT 20 NOT NULL,
	"class_size" integer DEFAULT 20 NOT NULL,
	"nomination_opens_at" timestamp with time zone,
	"nomination_closes_at" timestamp with time zone,
	"application_opens_at" timestamp with time zone,
	"application_closes_at" timestamp with time zone,
	"event_at" timestamp with time zone,
	"event_location" text,
	"keynote_speaker" text,
	"created_by_clerk_id" text NOT NULL,
	"updated_by_clerk_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "twenty_under_twenty_program_status_check" CHECK ("twenty_under_twenty_programs"."status" in ('draft', 'nominations_open', 'applications_open', 'review', 'announced', 'archived')),
	CONSTRAINT "twenty_under_twenty_program_year_check" CHECK ("twenty_under_twenty_programs"."year" between 2026 and 2200),
	CONSTRAINT "twenty_under_twenty_program_age_check" CHECK ("twenty_under_twenty_programs"."age_limit" between 13 and 25),
	CONSTRAINT "twenty_under_twenty_program_class_size_check" CHECK ("twenty_under_twenty_programs"."class_size" between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "twenty_under_twenty_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"receipt_code" text NOT NULL,
	"student_first_name" text NOT NULL,
	"student_last_name" text NOT NULL,
	"student_email" text NOT NULL,
	"birth_date" text NOT NULL,
	"school" text NOT NULL,
	"grade" text NOT NULL,
	"city" text NOT NULL,
	"county" text NOT NULL,
	"educator_name" text,
	"educator_email" text,
	"educator_title" text,
	"relationship" text,
	"community_impact" text NOT NULL,
	"service_summary" text NOT NULL,
	"future_goals" text NOT NULL,
	"supporting_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"guardian_name" text,
	"guardian_email" text,
	"applicant_attested" boolean DEFAULT false NOT NULL,
	"publication_consent" boolean DEFAULT false NOT NULL,
	"educator_attested" boolean DEFAULT false NOT NULL,
	"review_score" integer,
	"review_recommendation" text,
	"private_review_notes" text,
	"reviewed_by_clerk_id" text,
	"reviewed_at" timestamp with time zone,
	"honoree_snapshot" jsonb,
	"published_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "twenty_under_twenty_submission_kind_check" CHECK ("twenty_under_twenty_submissions"."kind" in ('educator_nomination', 'student_application')),
	CONSTRAINT "twenty_under_twenty_submission_status_check" CHECK ("twenty_under_twenty_submissions"."status" in ('submitted', 'eligible', 'in_review', 'finalist', 'selected', 'declined', 'withdrawn')),
	CONSTRAINT "twenty_under_twenty_submission_score_check" CHECK ("twenty_under_twenty_submissions"."review_score" is null or "twenty_under_twenty_submissions"."review_score" between 0 and 100),
	CONSTRAINT "twenty_under_twenty_submission_publish_check" CHECK ("twenty_under_twenty_submissions"."published_at" is null or ("twenty_under_twenty_submissions"."status" = 'selected' and "twenty_under_twenty_submissions"."publication_consent" = true and "twenty_under_twenty_submissions"."honoree_snapshot" is not null))
);
--> statement-breakpoint
ALTER TABLE "twenty_under_twenty_submissions" ADD CONSTRAINT "twenty_under_twenty_submissions_program_id_twenty_under_twenty_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."twenty_under_twenty_programs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "twenty_under_twenty_program_year_idx" ON "twenty_under_twenty_programs" USING btree ("year");--> statement-breakpoint
CREATE INDEX "twenty_under_twenty_program_status_idx" ON "twenty_under_twenty_programs" USING btree ("status","year");--> statement-breakpoint
CREATE UNIQUE INDEX "twenty_under_twenty_receipt_idx" ON "twenty_under_twenty_submissions" USING btree ("receipt_code");--> statement-breakpoint
CREATE INDEX "twenty_under_twenty_submission_queue_idx" ON "twenty_under_twenty_submissions" USING btree ("program_id","status","submitted_at");--> statement-breakpoint
CREATE INDEX "twenty_under_twenty_submission_kind_idx" ON "twenty_under_twenty_submissions" USING btree ("program_id","kind","submitted_at");