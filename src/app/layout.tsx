import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import LayoutClient from "@/components/layout-client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Spadas AI — Reseller Inventory & Analytics",
    template: "%s · Spadas AI",
  },
  description:
    "Track inventory, profits, and sales across marketplaces in one dashboard built for resellers.",
  metadataBase: new URL("https://spadas-tech.vercel.app"),
  applicationName: "Spadas AI",
  authors: [{ name: "SpadasTechnology" }],
  keywords: [
    "reseller",
    "inventory",
    "marketplace",
    "ebay",
    "vinted",
    "depop",
    "flip",
  ],
  openGraph: {
    type: "website",
    url: "https://spadas-tech.vercel.app",
    title: "Spadas AI — Reseller Inventory & Analytics",
    description:
      "Track inventory, profits, and sales in one dashboard built for resellers.",
    siteName: "Spadas AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spadas AI",
    description: "Reseller inventory management and analytics.",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spadas AI",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        <LayoutClient>{children}</LayoutClient>
        <Analytics />
        <SpeedInsights />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
