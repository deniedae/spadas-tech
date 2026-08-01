import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import { Analytics } from "@vercel/analytics/next";
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
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
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
      <body className="min-h-screen bg-gray-100 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />

          <main className="flex-1 overflow-x-hidden p-6 lg:p-8">
            {children}
          </main>
        </div>

        <Analytics />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
