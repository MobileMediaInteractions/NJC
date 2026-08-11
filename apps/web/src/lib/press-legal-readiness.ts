import { PRESS_LICENSE_VERSION, PRESS_POLICY_VERSION } from "@/lib/press-kit-policy";

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function getPressLegalReadiness() {
  const approvedPolicyVersion = process.env.PRESS_LEGAL_APPROVED_POLICY_VERSION?.trim() || null;
  const approvedLicenseVersion = process.env.PRESS_LEGAL_APPROVED_LICENSE_VERSION?.trim() || null;
  const retention = Number.parseInt(process.env.PRESS_REQUEST_RETENTION_DAYS || "", 10);
  const checks = [
    { id: "policy", label: "Counsel-approved policy mapping", ready: approvedPolicyVersion === PRESS_POLICY_VERSION, expected: PRESS_POLICY_VERSION },
    { id: "license", label: "Counsel-approved authorization copy", ready: approvedLicenseVersion === PRESS_LICENSE_VERSION, expected: PRESS_LICENSE_VERSION },
    { id: "entity", label: "Operating entity", ready: present("PRESS_LEGAL_ENTITY_NAME") },
    { id: "jurisdiction", label: "Jurisdiction and governing-law decision", ready: present("PRESS_LEGAL_JURISDICTION") },
    { id: "contact", label: "Monitored press contact", ready: present("PRESS_CONTACT_EMAIL") },
    { id: "retention", label: "Approved request-retention period", ready: Number.isInteger(retention) && retention > 0 && retention <= 3650 },
  ];
  return {
    policyVersion: PRESS_POLICY_VERSION,
    licenseVersion: PRESS_LICENSE_VERSION,
    approvedPolicyVersion,
    approvedLicenseVersion,
    checks,
    legallyValidated: checks.every((check) => check.ready),
    provisionalNoticeRequired: !checks.every((check) => check.ready),
  };
}
