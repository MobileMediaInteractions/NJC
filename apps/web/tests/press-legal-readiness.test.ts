import assert from "node:assert/strict";
import test from "node:test";
import { PRESS_LICENSE_VERSION, PRESS_POLICY_VERSION } from "../src/lib/press-kit-policy";
import { getPressLegalReadiness } from "../src/lib/press-legal-readiness";

const keys = ["PRESS_LEGAL_APPROVED_POLICY_VERSION", "PRESS_LEGAL_APPROVED_LICENSE_VERSION", "PRESS_LEGAL_ENTITY_NAME", "PRESS_LEGAL_JURISDICTION", "PRESS_CONTACT_EMAIL", "PRESS_REQUEST_RETENTION_DAYS"] as const;

test("press legal readiness fails closed when external approvals are absent", () => {
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  keys.forEach((key) => delete process.env[key]);
  const readiness = getPressLegalReadiness();
  assert.equal(readiness.legallyValidated, false);
  assert.equal(readiness.provisionalNoticeRequired, true);
  for (const key of keys) if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
});

test("only exact policy and license versions satisfy the legal gate", () => {
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.PRESS_LEGAL_APPROVED_POLICY_VERSION = PRESS_POLICY_VERSION;
  process.env.PRESS_LEGAL_APPROVED_LICENSE_VERSION = PRESS_LICENSE_VERSION;
  process.env.PRESS_LEGAL_ENTITY_NAME = "Reviewed entity";
  process.env.PRESS_LEGAL_JURISDICTION = "Reviewed jurisdiction";
  process.env.PRESS_CONTACT_EMAIL = "press@example.com";
  process.env.PRESS_REQUEST_RETENTION_DAYS = "365";
  assert.equal(getPressLegalReadiness().legallyValidated, true);
  process.env.PRESS_LEGAL_APPROVED_POLICY_VERSION = "older-policy";
  assert.equal(getPressLegalReadiness().legallyValidated, false);
  for (const key of keys) if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
});
