import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The New Jersey Courier",
    short_name: "NJ Courier",
    description: "The Authoritative Voice of the Garden State",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ee",
    theme_color: "#173e32",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
