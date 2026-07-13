import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Harborline Local", short_name: "Harborline", description: "The coast, clearly reported.", start_url: "/", display: "standalone", background_color: "#f8fafb", theme_color: "#072f4d", icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }] };
}
