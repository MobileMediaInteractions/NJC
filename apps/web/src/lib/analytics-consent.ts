export const consentStorageKey = "harborline-cookie-consent-v1";
export const consentEventName = "harborline:consent";
export const consentOpenEventName = "harborline:consent-open";
export type ConsentChoice = "essential" | "analytics" | "analytics_ads";

export function readConsentChoice(storage: Pick<Storage, "getItem">): ConsentChoice | null {
  try {
    const raw = storage.getItem(consentStorageKey);
    if (!raw) return null;
    const value = (JSON.parse(raw) as { value?: unknown }).value;
    return value === "essential" || value === "analytics" || value === "analytics_ads"
      ? value
      : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(storage: Pick<Storage, "getItem">) {
  const choice = readConsentChoice(storage);
  return choice === "analytics" || choice === "analytics_ads";
}

export function hasAdvertisingConsent(storage: Pick<Storage, "getItem">) {
  return readConsentChoice(storage) === "analytics_ads";
}
