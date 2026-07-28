import { asc, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, hasDatabase } from "@harborline/backend/db";
import { legalCenterEntries } from "@harborline/backend/schema";

export const legalSeveritySchema = z.enum([
  "informational",
  "material",
  "critical",
]);

export type LegalSeverity = z.infer<typeof legalSeveritySchema>;

export interface LegalVerificationRequirement {
  id: string;
  label: string;
  description: string;
}

const commonRequirements: LegalVerificationRequirement[] = [
  {
    id: "source_verified",
    label: "Source and factual basis verified",
    description:
      "Confirm every factual statement against an identified source, governing document or authoritative record.",
  },
  {
    id: "scope_reviewed",
    label: "Scope and affected readers reviewed",
    description:
      "Confirm who this language applies to and that the notice does not overstate rights, duties or coverage.",
  },
];

const materialRequirements: LegalVerificationRequirement[] = [
  {
    id: "effective_date_confirmed",
    label: "Effective date and transition confirmed",
    description:
      "Confirm when the language takes effect and whether existing users, records or agreements need notice.",
  },
  {
    id: "linked_policies_checked",
    label: "Related policies and product behavior checked",
    description:
      "Review linked policies, forms, consent flows, APIs and product behavior for contradictions.",
  },
];

const criticalRequirements: LegalVerificationRequirement[] = [
  {
    id: "qualified_review_recorded",
    label: "Qualified legal review recorded",
    description:
      "Confirm review by authorized counsel or the designated legal owner; do not represent this checklist as legal advice.",
  },
  {
    id: "rollback_and_notice_ready",
    label: "Notice, retention and rollback plan ready",
    description:
      "Confirm the required notice path, preserved prior revision and a documented correction or rollback procedure.",
  },
];

export const legalSeverityPolicy = {
  informational: {
    label: "Informational",
    description:
      "Operational or explanatory language that does not materially change reader rights or obligations.",
    requirements: commonRequirements,
    independentApproval: false,
  },
  material: {
    label: "Material",
    description:
      "Language that may affect expectations, eligibility, data handling, access or an existing policy.",
    requirements: [...commonRequirements, ...materialRequirements],
    independentApproval: false,
  },
  critical: {
    label: "Critical",
    description:
      "Rights, obligations, liability, privacy, regulatory, payment or enforcement language.",
    requirements: [
      ...commonRequirements,
      ...materialRequirements,
      ...criticalRequirements,
    ],
    independentApproval: true,
  },
} satisfies Record<
  LegalSeverity,
  {
    label: string;
    description: string;
    requirements: LegalVerificationRequirement[];
    independentApproval: boolean;
  }
>;

const legalBodySchema = z
  .array(z.string().trim().min(1).max(2_000))
  .min(1, "Add at least one paragraph.")
  .max(30);

export const legalEntryInput = z.object({
  title: z.string().trim().min(4).max(140),
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and hyphens.",
    )
    .max(120),
  summary: z.string().trim().min(10).max(360),
  body: legalBodySchema,
  severity: legalSeveritySchema,
  sortOrder: z.number().int().min(0).max(10_000),
});

export const legalEntryUpdateInput = legalEntryInput.extend({
  expectedUpdatedAt: z.iso.datetime(),
});

export const legalVerificationInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("submit"),
    checks: z.array(z.string().trim().min(1).max(80)).max(12),
    confirmation: z.string().trim().max(180),
    expectedUpdatedAt: z.iso.datetime(),
  }),
  z.object({
    action: z.literal("approve"),
    confirmation: z.string().trim().max(180),
    expectedUpdatedAt: z.iso.datetime(),
  }),
  z.object({
    action: z.literal("return_to_draft"),
    reason: z.string().trim().min(10).max(500),
    expectedUpdatedAt: z.iso.datetime(),
  }),
]);

export function legalConfirmationPhrase(slug: string, action: "submit" | "approve") {
  return `${action === "approve" ? "APPROVE" : "PUBLISH"} LEGAL ${slug.toUpperCase()}`;
}

export function missingLegalVerificationChecks(
  severity: LegalSeverity,
  checks: readonly string[],
) {
  const completed = new Set(checks);
  return legalSeverityPolicy[severity].requirements.filter(
    (requirement) => !completed.has(requirement.id),
  );
}

export function canSelfPublishLegalEntry(severity: LegalSeverity) {
  return !legalSeverityPolicy[severity].independentApproval;
}

export async function getPublishedLegalEntries() {
  if (!hasDatabase()) return [];
  try {
    const rows = await getDb()
      .select({
        id: legalCenterEntries.id,
        slug: legalCenterEntries.slug,
        sortOrder: legalCenterEntries.sortOrder,
        snapshot: legalCenterEntries.publishedSnapshot,
      })
      .from(legalCenterEntries)
      .where(isNotNull(legalCenterEntries.publishedSnapshot))
      .orderBy(asc(legalCenterEntries.sortOrder), asc(legalCenterEntries.title));

    return rows.flatMap((row) =>
      row.snapshot
        ? [
            {
              id: row.id,
              slug: row.slug,
              sortOrder: row.sortOrder,
              ...row.snapshot,
            },
          ]
        : [],
    );
  } catch (error) {
    console.error("Published legal center lookup failed", error);
    return [];
  }
}
