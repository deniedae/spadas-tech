import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Spadas AI — Reseller Inventory & Analytics",
    short_name: "Spadas AI",
    description:
      "Track inventory, calculate profits, and generate AI listings on the go.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090d16",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
