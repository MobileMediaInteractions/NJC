import type { ApiEnvelope } from "@harborline/contracts";

export type ApiClientOptions = {
  baseUrl: string;
  fetcher?: typeof fetch;
};

export function normalizeApiBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

export async function requestHarborlineApi<T>(
  path: string,
  options: ApiClientOptions,
  init?: RequestInit,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(
    `${normalizeApiBaseUrl(options.baseUrl)}${path}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    },
  );
  const payload = (await response.json()) as ApiEnvelope<T> & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(
      payload.error?.message ?? `Request failed (${response.status})`,
    );
  }
  return payload.data;
}
