import assert from "node:assert/strict";
import test from "node:test";
import { getRequestOrigin, getSiteOrigin } from "../src/lib/origin";

const keys = ["NEXT_PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

test("a configured custom domain becomes the canonical origin", () => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.NEXT_PUBLIC_SITE_URL = "https://news.example.com/section?ignored=true";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "temporary.vercel.app";
    process.env.VERCEL_URL = "preview.vercel.app";
    assert.equal(getSiteOrigin(), "https://news.example.com");
    assert.equal(getRequestOrigin(new Request("https://preview.vercel.app/story")), "https://news.example.com");
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Vercel production and request origins work before a custom domain exists", () => {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "njc-web.vercel.app";
    process.env.VERCEL_URL = "deployment.vercel.app";
    assert.equal(getSiteOrigin(), "https://njc-web.vercel.app");
    assert.equal(getRequestOrigin(new Request("https://deployment.vercel.app/api/v1/config")), "https://deployment.vercel.app");
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
