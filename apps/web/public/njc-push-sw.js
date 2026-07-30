"use strict";

const fallbackDestination = "/";

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

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon",
      badge: "/favicon",
      tag: `njc-${campaignId}`,
      renotify: false,
      data: {
        destination: safeDestination(payload.destination),
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

  event.waitUntil(
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
  );
});
