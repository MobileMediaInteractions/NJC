import Constants from "expo-constants";
import { Platform } from "react-native";
import { apiBaseUrl } from "@/lib/api";
import { deviceStorage } from "@/lib/storage";

const idKey = "njcourier:employee:installation";
const seenKey = "njcourier:employee:last-presence";
function createId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`.slice(0, 64); }
export async function reportEmployeeAudience(token: string) {
  const last = Number(await deviceStorage.getItem(seenKey) ?? 0);
  if (Date.now() - last < 15 * 60_000) return;
  let installationId = await deviceStorage.getItem(idKey);
  if (!installationId) { installationId = createId(); await deviceStorage.setItem(idKey, installationId); }
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
  const response = await fetch(`${apiBaseUrl}/api/v1/audience/presence`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ installationId, platform, source: "employee-app", appVersion: Constants.expoConfig?.version ?? "1.0.0" }) });
  if (response.ok) await deviceStorage.setItem(seenKey, String(Date.now()));
}
