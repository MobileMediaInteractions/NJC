import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "The New Jersey Courier",
    short_name: "NJ Courier",
    description: "The Authoritative Voice of the Garden State",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "en-US",
    dir: "ltr",
    background_color: "#f8f5ee",
    theme_color: "#173e32",
    categories: ["news", "magazines"],
    icons: [
      { src: "/favicon", sizes: "64x64", type: "image/png", purpose: "any" },
      {
        src: "/assets/brand/v1/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/brand/v1/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/assets/brand/v1/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Latest local news",
        short_name: "Latest",
        description: "Open the latest reporting from the Courier",
        url: "/latest?source=pwa-shortcut",
        icons: [
          {
            src: "/assets/brand/v1/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Local weather",
        short_name: "Weather",
        description: "Open the local weather desk",
        url: "/weather?source=pwa-shortcut",
        icons: [
          {
            src: "/assets/brand/v1/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "Submit a news tip",
        short_name: "Send a tip",
        description: "Send a secure news tip to the newsroom",
        url: "/tips?source=pwa-shortcut",
        icons: [
          {
            src: "/assets/brand/v1/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
    prefer_related_applications: false,
  };
}
