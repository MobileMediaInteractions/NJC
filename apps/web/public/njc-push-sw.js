"use strict";

const fallbackDestination = "/";
const shellCache = "njc-pwa-shell-v1";
const pageCache = "njc-pwa-pages-v1";
const assetCache = "njc-pwa-assets-v1";
const offlineDestination = "/offline";
const shellAssets = [
  offlineDestination,
  "/manifest.webmanifest",
  "/assets/brand/v1/app-icon-192.png",
  "/assets/brand/v1/app-icon-512.png",
  "/assets/brand/v1/app-icon-maskable-512.png",
  "/assets/brand/v1/wordmark-inverse.svg",
];
const privatePrefixes = [
  "/api",
  "/studio",
  "/sign-in",
  "/sign-up",
  "/login",
  "/profile",
  "/developers",
  "/distribution",
  "/plus",
  "/employee-link",
  "/dev",
  "/data-requests",
];

function isPrivatePath(pathname) {
  return privatePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isCacheableAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/assets/") ||
    pathname === "/favicon" ||
    pathname === "/manifest.webmanifest"
  );
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}

async function cacheSuccessful(cacheName, request, response, limit) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  await trimCache(cache, limit);
}

async function networkFirstPage(request) {
  const cache = await caches.open(pageCache);
  try {
    const response = await fetch(request);
    await cacheSuccessful(pageCache, request, response, 40);
    return response;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(offlineDestination)) ||
      Response.error()
    );
  }
}

async function staleWhileRevalidateAsset(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      await cacheSuccessful(assetCache, request, response, 80);
      return response;
    })
    .catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(shellCache)
      .then((cache) => cache.addAll(shellAssets))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("njc-pwa-") &&
                ![shellCache, pageCache, assetCache].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (!request || request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivatePath(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }
  if (isCacheableAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidateAsset(request));
  }
});

function safeDestination(value) {
  try {
    const url = new URL(
      typeof value === "string" ? value : fallbackDestination,
      self.location.origin,
    );
    return url.origin === self.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : fallbackDestination;
  } catch {
    return fallbackDestination;
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "The New Jersey Courier";
  const body =
    typeof payload.body === "string" ? payload.body.trim() : "";
  const campaignId =
    typeof payload.campaignId === "string" ? payload.campaignId : "news";
  const deliveryId =
    typeof payload.deliveryId === "string" ? payload.deliveryId : null;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/assets/brand/v1/app-icon-192.png",
      badge: "/assets/brand/v1/app-icon-192.png",
      tag: `njc-${campaignId}`,
      renotify: false,
      data: {
        destination: safeDestination(payload.destination),
        campaignId,
        deliveryId,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = safeDestination(
    event.notification.data && event.notification.data.destination,
  );
  const target = new URL(destination, self.location.origin).href;
  const campaignId =
    event.notification.data && event.notification.data.campaignId;
  const deliveryId =
    event.notification.data && event.notification.data.deliveryId;

  event.waitUntil(
    Promise.all([
      typeof campaignId === "string" && typeof deliveryId === "string"
        ? fetch("/api/v1/push/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "opened",
              campaignId,
              deliveryId,
            }),
          }).catch(() => null)
        : Promise.resolve(null),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then(async (clients) => {
        const sameOrigin = clients.find((client) => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });
        if (sameOrigin) {
          if ("navigate" in sameOrigin) await sameOrigin.navigate(target);
          return sameOrigin.focus();
        }
        return self.clients.openWindow(target);
        }),
    ]),
  );
});
