import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spadas AI — Reseller Inventory & Analytics",
    short_name: "Spadas AI",
    description:
      "Track inventory, calculate profits, and generate AI listings on the go.",
    start_url: "/dashboard",
    scope: "/",
    id: "/dashboard",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#090d16",
    theme_color: "#2563eb",
    lang: "en-US",
    dir: "ltr",
    categories: ["business", "productivity", "shopping"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "View inventory overview and analytics",
      },
      {
        name: "AI Listing Generator",
        url: "/generator",
        description: "Snap a photo to generate an AI listing",
      },
      {
        name: "Sourcing Assistant",
        url: "/sourcing",
        description: "Analyze resale ROI and flip potential",
      },
      {
        name: "Inventory Listings",
        url: "/listings",
        description: "View and edit inventory items",
      },
    ],
  };
}
