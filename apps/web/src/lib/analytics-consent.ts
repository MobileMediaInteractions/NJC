export const consentStorageKey = "harborline-cookie-consent-v1";
export const consentEventName = "harborline:consent";

export function hasAnalyticsConsent(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(consentStorageKey);
    if (!raw) return false;
    return (JSON.parse(raw) as { value?: unknown }).value === "analytics";
  } catch {
    return false;
  }
}
