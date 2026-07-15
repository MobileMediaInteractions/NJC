import Constants from "expo-constants";
import { normalizeApiBaseUrl, requestHarborlineApi } from "@harborline/api-client";

const configured = process.env.EXPO_PUBLIC_EMPLOYEE_API_URL ?? process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl;
export const apiBaseUrl = normalizeApiBaseUrl(typeof configured === "string" ? configured : "http://localhost:3000");

export function employeeRequest<T>(path: string, token: string, init?: RequestInit) {
  return requestHarborlineApi<T>(path, { baseUrl: apiBaseUrl }, { ...init, headers: { Authorization: `Bearer ${token}`, ...init?.headers } });
}
