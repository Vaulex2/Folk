import type { MetadataRoute } from "next";
import { FLOCK_NAME } from "@/lib/flockName";

// Static English name: metadata routes can't read the locale cookie.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${FLOCK_NAME} — flock & pedigree manager`,
    short_name: FLOCK_NAME,
    description: "Record-keeping and pedigree tracking for a farm flock",
    start_url: "/",
    display: "standalone",
    background_color: "#f5ead8",
    theme_color: "#c67139",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
