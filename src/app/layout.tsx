import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import LayoutClient from "@/components/layout-client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Spadas Lens: Reseller Scanner",
    template: "%s · Spadas Lens",
  },
  description:
    "Instant optical scanner & AI reseller copilot. Scan shelves, detect flip margins, compare sold comps on eBay, Poshmark & Mercari, and check authenticity.",
  metadataBase: new URL("https://spadas.ai"),
  alternates: {
    canonical: "https://spadas.ai",
  },
  applicationName: "Spadas Lens",
  authors: [{ name: "SpadasTechnology" }],
  keywords: [
    "reseller scanner",
    "spadas lens",
    "reseller",
    "inventory",
    "marketplace",
    "ebay",
    "vinted",
    "depop",
    "flip",
    "authenticity check",
    "forensic audit",
  ],
  openGraph: {
    type: "website",
    url: "https://spadas.ai",
    title: "Spadas Lens: Reseller Scanner",
    description:
      "Instant optical scanner & AI reseller copilot. Scan shelves, detect flip margins, compare sold comps on eBay, Poshmark & Mercari, and check authenticity.",
    siteName: "Spadas Lens",
    images: [
      {
        url: "https://spadas.ai/og-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Spadas Lens: Reseller Scanner — Live Optical Scanner & Forensic Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Spadas Lens: Reseller Scanner",
    description:
      "Instant optical scanner & AI reseller copilot. Scan shelves, detect flip margins, compare sold comps on eBay, Poshmark & Mercari, and check authenticity.",
    images: ["https://spadas.ai/og-preview.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spadas Lens",
  },
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#030305" },
    { media: "(prefers-color-scheme: dark)", color: "#030305" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geistSans.variable, geistMono.variable)}>
      <head>
        {/* Google tag (gtag.js) */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18430569894"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18430569894');
            `,
          }}
        />
        <link rel="canonical" href="https://spadas.ai" />
        <meta property="og:image" content="https://spadas.ai/og-preview.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#030305" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    if (reg) reg.update();
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#090A0F] text-zinc-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        <LayoutClient>{children}</LayoutClient>
        <Analytics />
        <SpeedInsights />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
