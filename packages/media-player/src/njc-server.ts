export type NjcDeveloperNewsClientOptions = {
  baseUrl: string;
  apiKey: string;
  fetch?: typeof fetch;
};

export function createNjcDeveloperNewsClient(options: NjcDeveloperNewsClientOptions) {
  if (typeof window !== "undefined") throw new Error("NJC developer API keys must only be used in trusted server code.");
  const fetcher = options.fetch ?? fetch;
  return {
    async listStories<T = unknown>(query: Record<string, string | number | boolean | undefined> = {}) {
      const target = new URL("/api/developer/v1/stories", options.baseUrl);
      for (const [key, value] of Object.entries(query)) if (value !== undefined) target.searchParams.set(key, String(value));
      const response = await fetcher(target, { headers: { "X-API-Key": options.apiKey }, cache: "no-store" });
      const payload = await response.json().catch(() => null) as { data?: T; error?: { message?: string; code?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || `NJC developer request failed (${response.status})`);
      return payload?.data as T;
    },
  };
}
