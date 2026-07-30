import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

type Listener = (event: {
  data?: { json(): unknown };
  notification?: {
    data?: {
      destination?: string;
      campaignId?: string;
      deliveryId?: string;
    };
    close(): void;
  };
  waitUntil(value: Promise<unknown>): void;
}) => void;

async function serviceWorkerHarness() {
  const listeners = new Map<string, Listener>();
  const notifications: Array<{
    title: string;
    options: {
      data?: {
        destination?: string;
        campaignId?: string;
        deliveryId?: string;
      };
    };
  }> = [];
  const opened: string[] = [];
  const fetches: Array<{ url: string; body: string | undefined }> = [];
  const source = await readFile(
    path.join(process.cwd(), "public/njc-push-sw.js"),
    "utf8",
  );
  const self = {
    location: { origin: "https://www.thejerseycourier.com" },
    registration: {
      async showNotification(
        title: string,
        options: {
          data?: {
            destination?: string;
            campaignId?: string;
            deliveryId?: string;
          };
        },
      ) {
        notifications.push({ title, options });
      },
    },
    clients: {
      async matchAll() {
        return [];
      },
      async openWindow(url: string) {
        opened.push(url);
      },
    },
    addEventListener(type: string, listener: Listener) {
      listeners.set(type, listener);
    },
  };
  async function fetch(url: string, options?: { body?: string }) {
    fetches.push({ url, body: options?.body });
    return { ok: true };
  }
  vm.runInNewContext(source, { self, URL, fetch });
  return { listeners, notifications, opened, fetches };
}

test("push payloads cannot send notification clicks to an external origin", async () => {
  const harness = await serviceWorkerHarness();
  let pending: Promise<unknown> = Promise.resolve();
  harness.listeners.get("push")?.({
    data: {
      json: () => ({
        title: "Local alert",
        body: "Read the latest report.",
        destination: "https://attacker.example/steal",
      }),
    },
    waitUntil(value) {
      pending = value;
    },
  });
  await pending;
  assert.equal(harness.notifications[0]?.title, "Local alert");
  assert.equal(harness.notifications[0]?.options.data?.destination, "/");
});

test("notification opens are reported once with opaque campaign and delivery IDs", async () => {
  const harness = await serviceWorkerHarness();
  let pending: Promise<unknown> = Promise.resolve();
  harness.listeners.get("notificationclick")?.({
    notification: {
      data: {
        destination: "/latest",
        campaignId: "0d85c6b6-3691-4ed2-a8a8-dc460402cd5e",
        deliveryId: "32e4860f-ded4-4960-899c-b8a9ab506c56",
      },
      close() {},
    },
    waitUntil(value) {
      pending = value;
    },
  });
  await pending;
  assert.equal(harness.fetches.length, 1);
  assert.equal(harness.fetches[0]?.url, "/api/v1/push/events");
  assert.deepEqual(JSON.parse(harness.fetches[0]?.body ?? "{}"), {
    event: "opened",
    campaignId: "0d85c6b6-3691-4ed2-a8a8-dc460402cd5e",
    deliveryId: "32e4860f-ded4-4960-899c-b8a9ab506c56",
  });
});

test("notification clicks open a validated same-origin destination", async () => {
  const harness = await serviceWorkerHarness();
  let pending: Promise<unknown> = Promise.resolve();
  let closed = false;
  harness.listeners.get("notificationclick")?.({
    notification: {
      data: { destination: "/story/local-report" },
      close() {
        closed = true;
      },
    },
    waitUntil(value) {
      pending = value;
    },
  });
  await pending;
  assert.equal(closed, true);
  assert.deepEqual(harness.opened, [
    "https://www.thejerseycourier.com/story/local-report",
  ]);
});
