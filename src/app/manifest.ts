import type { MetadataRoute } from "next";

/**
 * Android uses this manifest for "Add to Home screen" and WebAPK installs;
 * iOS reads the apple-touch-icon and `appleWebApp` metadata from the layout.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Eventas — AI event planning studio",
    short_name: "Eventas",
    description: "Turn a 60-second brief into a budget, timeline, vendor checklist, and ideas for weddings, birthdays, and community events.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f4ee",
    theme_color: "#f7f4ee",
    lang: "en",
    categories: ["lifestyle", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
