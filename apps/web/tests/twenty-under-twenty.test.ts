import assert from "node:assert/strict";
import test from "node:test";
import {
  canConfigureTwentyUnderTwenty,
  canManageTwentyUnderTwenty,
  isIntakeOpen,
  isUnderAgeLimit,
  programInput,
  publicSubmissionInput,
  submissionReviewInput,
} from "../src/lib/twenty-under-twenty";

test("program configuration validates chronology and limits", () => {
  const base = {
    year: 2027,
    status: "nominations_open",
    title: "20 Under 20",
    description: "A sufficiently detailed description for the annual program.",
    eligibilitySummary: "New Jersey high school students under 20",
    ageLimit: 20,
    classSize: 20,
    nominationOpensAt: "2027-01-02T12:00:00.000Z",
    nominationClosesAt: "2027-02-02T12:00:00.000Z",
    applicationOpensAt: null,
    applicationClosesAt: null,
    eventAt: null,
    eventLocation: null,
    keynoteSpeaker: null,
  };
  assert.equal(programInput.safeParse(base).success, true);
  assert.equal(
    programInput.safeParse({
      ...base,
      nominationClosesAt: "2027-01-01T12:00:00.000Z",
    }).success,
    false,
  );
});

test("public intake is gated by both stage and dates", () => {
  const program = {
    status: "nominations_open",
    nominationOpensAt: new Date("2027-01-01T00:00:00Z"),
    nominationClosesAt: new Date("2027-02-01T00:00:00Z"),
    applicationOpensAt: null,
    applicationClosesAt: null,
  };
  const now = new Date("2027-01-15T00:00:00Z");
  assert.equal(isIntakeOpen(program, "educator_nomination", now), true);
  assert.equal(isIntakeOpen(program, "student_application", now), false);
  assert.equal(
    isIntakeOpen(program, "educator_nomination", new Date("2027-03-01T00:00:00Z")),
    false,
  );
});

test("age eligibility is strict and rejects future dates", () => {
  const now = new Date("2027-07-28T12:00:00Z");
  assert.equal(isUnderAgeLimit("2008-07-29", 20, now), true);
  assert.equal(isUnderAgeLimit("2007-07-28", 20, now), false);
  assert.equal(isUnderAgeLimit("2030-01-01", 20, now), false);
});

test("student and educator submissions require consent and substantial answers", () => {
  const shared = {
    studentFirstName: "Avery",
    studentLastName: "Rivera",
    studentEmail: "avery@example.org",
    birthDate: "2010-05-05",
    school: "Central High School",
    grade: "11",
    city: "New Brunswick",
    county: "Middlesex",
    communityImpact: "A".repeat(50),
    serviceSummary: "B".repeat(50),
    futureGoals: "C".repeat(30),
    supportingLinks: [],
    guardianName: "Jordan Rivera",
    guardianEmail: "jordan@example.org",
    publicationConsent: true,
    website: "",
  };
  assert.equal(
    publicSubmissionInput.safeParse({
      ...shared,
      kind: "student_application",
      educatorName: "",
      educatorEmail: "",
      educatorTitle: "",
      relationship: "",
      educatorAttested: false,
      applicantAttested: true,
    }).success,
    true,
  );
  assert.equal(
    publicSubmissionInput.safeParse({
      ...shared,
      kind: "educator_nomination",
      educatorName: "Morgan Lee",
      educatorEmail: "morgan@school.edu",
      educatorTitle: "Teacher",
      relationship: "Classroom educator",
      educatorAttested: false,
      applicantAttested: false,
    }).success,
    false,
  );
});

test("review publishing requires schema-valid public profile fields", () => {
  assert.equal(
    submissionReviewInput.safeParse({
      status: "selected",
      reviewScore: 91,
      reviewRecommendation: "Select",
      privateReviewNotes: "Verified by the panel.",
      publish: true,
      publicBio: "A public bio.",
      publicQuote: null,
      publicPhotoUrl: null,
    }).success,
    true,
  );
  assert.equal(
    submissionReviewInput.safeParse({
      status: "invented",
      reviewScore: 101,
      reviewRecommendation: null,
      privateReviewNotes: null,
      publish: false,
      publicBio: null,
      publicQuote: null,
      publicPhotoUrl: null,
    }).success,
    false,
  );
});

test("only editors and administrators can review; only administrators configure", () => {
  assert.equal(canManageTwentyUnderTwenty("editor"), true);
  assert.equal(canManageTwentyUnderTwenty("reporter"), false);
  assert.equal(canConfigureTwentyUnderTwenty("admin"), true);
  assert.equal(canConfigureTwentyUnderTwenty("editor"), false);
});
