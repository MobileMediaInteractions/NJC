import assert from "node:assert/strict";
import test from "node:test";
import { getRedisRestConfig } from "../src/lib/redis";

const keys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
] as const;

test("Redis accepts Vercel KV credentials and prefers explicit Upstash credentials", () => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(getRedisRestConfig(), null);

    process.env.KV_REST_API_URL = "https://kv.example.test";
    process.env.KV_REST_API_TOKEN = "kv-token";
    assert.deepEqual(getRedisRestConfig(), {
      url: "https://kv.example.test",
      token: "kv-token",
    });

    process.env.UPSTASH_REDIS_REST_URL = "https://upstash.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "upstash-token";
    assert.deepEqual(getRedisRestConfig(), {
      url: "https://upstash.example.test",
      token: "upstash-token",
    });
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
