import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { StaffRole } from "@/lib/types";

export const programStatuses = [
  "draft",
  "nominations_open",
  "applications_open",
  "review",
  "announced",
  "archived",
] as const;

export const submissionStatuses = [
  "submitted",
  "eligible",
  "in_review",
  "finalist",
  "selected",
  "declined",
  "withdrawn",
] as const;

export const submissionKinds = [
  "educator_nomination",
  "student_application",
] as const;

const optionalDateTime = z.iso.datetime().nullable();
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const programInput = z
  .object({
    id: z.uuid().optional(),
    year: z.number().int().min(2026).max(2200),
    status: z.enum(programStatuses),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(20).max(2_000),
    eligibilitySummary: z.string().trim().min(10).max(500),
    ageLimit: z.number().int().min(13).max(25),
    classSize: z.number().int().min(1).max(100),
    nominationOpensAt: optionalDateTime,
    nominationClosesAt: optionalDateTime,
    applicationOpensAt: optionalDateTime,
    applicationClosesAt: optionalDateTime,
    eventAt: optionalDateTime,
    eventLocation: optionalText(300),
    keynoteSpeaker: optionalText(160),
  })
  .superRefine((value, context) => {
    for (const [openKey, closeKey] of [
      ["nominationOpensAt", "nominationClosesAt"],
      ["applicationOpensAt", "applicationClosesAt"],
    ] as const) {
      const opens = value[openKey];
      const closes = value[closeKey];
      if (opens && closes && new Date(opens) >= new Date(closes)) {
        context.addIssue({
          code: "custom",
          path: [closeKey],
          message: "The closing time must be after the opening time.",
        });
      }
    }
  });

const publicSubmissionBase = z.object({
  studentFirstName: z.string().trim().min(2).max(80),
  studentLastName: z.string().trim().min(2).max(80),
  studentEmail: z.email().max(254),
  birthDate: z.iso.date(),
  school: z.string().trim().min(2).max(180),
  grade: z.string().trim().min(1).max(30),
  city: z.string().trim().min(2).max(100),
  county: z.string().trim().min(2).max(100),
  communityImpact: z.string().trim().min(50).max(5_000),
  serviceSummary: z.string().trim().min(50).max(5_000),
  futureGoals: z.string().trim().min(30).max(3_000),
  supportingLinks: z.array(z.url().max(1_000)).max(5).default([]),
  guardianName: z.string().trim().max(120).optional().or(z.literal("")),
  guardianEmail: z.email().max(254).optional().or(z.literal("")),
  publicationConsent: z.literal(true),
  website: z.string().max(0).optional(),
});

export const educatorNominationInput = publicSubmissionBase.extend({
  kind: z.literal("educator_nomination"),
  educatorName: z.string().trim().min(2).max(120),
  educatorEmail: z.email().max(254),
  educatorTitle: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(10).max(500),
  educatorAttested: z.literal(true),
  applicantAttested: z.boolean().default(false),
});

export const studentApplicationInput = publicSubmissionBase.extend({
  kind: z.literal("student_application"),
  educatorName: z.string().trim().max(120).optional().or(z.literal("")),
  educatorEmail: z.email().max(254).optional().or(z.literal("")),
  educatorTitle: z.string().trim().max(120).optional().or(z.literal("")),
  relationship: z.string().trim().max(500).optional().or(z.literal("")),
  educatorAttested: z.boolean().default(false),
  applicantAttested: z.literal(true),
});

export const publicSubmissionInput = z.discriminatedUnion("kind", [
  educatorNominationInput,
  studentApplicationInput,
]);

export const submissionReviewInput = z.object({
  status: z.enum(submissionStatuses),
  reviewScore: z.number().int().min(0).max(100).nullable(),
  reviewRecommendation: z.string().trim().max(500).nullable(),
  privateReviewNotes: z.string().trim().max(5_000).nullable(),
  publish: z.boolean(),
  publicBio: z.string().trim().max(2_000).nullable(),
  publicQuote: z.string().trim().max(500).nullable(),
  publicPhotoUrl: z.url().max(1_000).nullable(),
});

export function canManageTwentyUnderTwenty(role: StaffRole) {
  return role === "admin" || role === "editor";
}

export function canConfigureTwentyUnderTwenty(role: StaffRole) {
  return role === "admin";
}

export function isIntakeOpen(
  program: {
    status: string;
    nominationOpensAt: Date | null;
    nominationClosesAt: Date | null;
    applicationOpensAt: Date | null;
    applicationClosesAt: Date | null;
  },
  kind: (typeof submissionKinds)[number],
  now = new Date(),
) {
  const nomination = kind === "educator_nomination";
  if (program.status !== (nomination ? "nominations_open" : "applications_open")) {
    return false;
  }
  const opens = nomination ? program.nominationOpensAt : program.applicationOpensAt;
  const closes = nomination ? program.nominationClosesAt : program.applicationClosesAt;
  return (!opens || opens <= now) && (!closes || closes > now);
}

export function isUnderAgeLimit(birthDate: string, ageLimit: number, now = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.valueOf()) || birth > now) return false;
  const cutoff = new Date(Date.UTC(
    now.getUTCFullYear() - ageLimit,
    now.getUTCMonth(),
    now.getUTCDate(),
  ));
  return birth > cutoff;
}

export function createSubmissionReceipt() {
  return `NJC20-${randomBytes(5).toString("hex").toUpperCase()}`;
}
