import assert from "node:assert/strict";
import test from "node:test";
import { createHttpMediaAdapter, createNjcSessionMediaAdapter, MediaAdapterError } from "../src/adapters";
import { createNjcDeveloperNewsClient } from "../src/njc-server";

test("generic adapters use host-defined routes, credentials and headers", async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const adapter = createHttpMediaAdapter({
    baseUrl: "https://media.example/",
    headers: async () => ({ Authorization: "Bearer host-session" }),
    credentials: "include",
    routes: { progress: "/progress" },
    fetch: async (input, init) => {
      requests.push({ url: String(input), init });
      return Response.json({ data: { ok: true } });
    },
  });
  await adapter.saveProgress?.({ contentId: "program", positionMs: 1_000, durationMs: 2_000, completed: false, reason: "interval" });
  assert.equal(requests[0]?.url, "https://media.example/progress");
  assert.equal(requests[0]?.init?.credentials, "include");
  assert.equal(new Headers(requests[0]?.init?.headers).get("Authorization"), "Bearer host-session");
});

test("NJC session adapter uses cookie authorization and maps the device platform", async () => {
  let captured: { url?: string; init?: RequestInit } = {};
  const adapter = createNjcSessionMediaAdapter({
    baseUrl: "https://www.thejerseycourier.com",
    devicePlatform: "tvos",
    fetch: async (input, init) => {
      captured = { url: String(input), init };
      return Response.json({ data: { ok: true } });
    },
  });
  await adapter.saveProgress?.({ contentId: "program", positionMs: 1_000, durationMs: 2_000, completed: false, reason: "pause" });
  assert.equal(captured.url, "https://www.thejerseycourier.com/api/v1/plus/progress");
  assert.equal(captured.init?.credentials, "include");
  assert.equal(JSON.parse(String(captured.init?.body)).devicePlatform, "tvos");
  assert.equal(new Headers(captured.init?.headers).has("X-API-Key"), false);
});

test("adapter errors preserve safe status and application code", async () => {
  const adapter = createHttpMediaAdapter({ routes: { progress: "/progress" }, fetch: async () => Response.json({ error: { code: "forbidden", message: "No access" } }, { status: 403 }) });
  await assert.rejects(() => adapter.saveProgress!({ contentId: "program", positionMs: 0, durationMs: 1, completed: false, reason: "pause" }), (error: unknown) => error instanceof MediaAdapterError && error.status === 403 && error.code === "forbidden");
});

test("NJC developer client sends API keys only from its explicit server entry point", async () => {
  let authorization = "";
  const client = createNjcDeveloperNewsClient({ baseUrl: "https://api.thejerseycourier.com", apiKey: "test_key", fetch: async (_input, init) => { authorization = new Headers(init?.headers).get("X-API-Key") ?? ""; return Response.json({ data: [{ id: "story" }] }); } });
  const stories = await client.listStories<Array<{ id: string }>>({ limit: 1 });
  assert.equal(authorization, "test_key");
  assert.equal(stories[0]?.id, "story");
});
