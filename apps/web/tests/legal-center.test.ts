import assert from "node:assert/strict";
import test from "node:test";
import {
  canSelfPublishLegalEntry,
  legalConfirmationPhrase,
  legalEntryInput,
  legalSeverityPolicy,
  missingLegalVerificationChecks,
} from "../src/lib/legal-center";

test("legal verification requirements increase with severity", () => {
  assert.equal(legalSeverityPolicy.informational.requirements.length, 2);
  assert.equal(legalSeverityPolicy.material.requirements.length, 4);
  assert.equal(legalSeverityPolicy.critical.requirements.length, 6);
  assert.equal(canSelfPublishLegalEntry("informational"), true);
  assert.equal(canSelfPublishLegalEntry("material"), true);
  assert.equal(canSelfPublishLegalEntry("critical"), false);
});

test("unknown client checks cannot satisfy a legal verification policy", () => {
  const required = legalSeverityPolicy.material.requirements.map(
    (requirement) => requirement.id,
  );
  assert.equal(
    missingLegalVerificationChecks("material", [
      ...required.slice(0, -1),
      "client_forged_check",
    ]).length,
    1,
  );
  assert.equal(
    missingLegalVerificationChecks("material", required).length,
    0,
  );
});

test("legal confirmation phrases are deterministic and action-specific", () => {
  assert.equal(
    legalConfirmationPhrase("privacy-notice", "submit"),
    "PUBLISH LEGAL PRIVACY-NOTICE",
  );
  assert.equal(
    legalConfirmationPhrase("privacy-notice", "approve"),
    "APPROVE LEGAL PRIVACY-NOTICE",
  );
});

test("legal drafts accept plain paragraphs and reject unsafe identifiers", () => {
  const valid = {
    title: "Advertising disclosure",
    slug: "advertising-disclosure",
    summary: "How sponsored placements are identified for Courier readers.",
    body: ["Sponsored placements are labeled clearly."],
    severity: "material" as const,
    sortOrder: 100,
  };
  assert.equal(legalEntryInput.safeParse(valid).success, true);
  assert.equal(
    legalEntryInput.safeParse({ ...valid, slug: "/privacy<script>" }).success,
    false,
  );
});

