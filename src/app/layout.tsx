import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import LayoutClient from "@/components/layout-client";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import { WebVitals } from "@/components/web-vitals";

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
    default: "Reseller Scanner - Spadas Lens: eBay Barcode & Profit Calculator",
    template: "%s · Reseller Scanner - Spadas Lens",
  },
  description:
    "Instant optical scanner & AI reseller copilot. Scan barcodes & thrift shelves in 0.5s, calculate net profit with live eBay, Poshmark & Mercari sold comps, and generate ready-to-post listings.",
  metadataBase: new URL("https://spadas.ai"),
  alternates: {
    canonical: "https://spadas.ai",
  },
  applicationName: "Reseller Scanner - Spadas Lens",
  authors: [{ name: "Spadas Lens" }],
  keywords: [
    "reseller scanner",
    "ebay barcode scanner",
    "thrift store profit calculator",
    "ebay sold comps scanner",
    "spadas lens",
    "reseller inventory app",
    "poshmark fee calculator",
    "mercari profit calculator",
    "depop crosslisting tool",
    "thrift flips scanner",
    "garage sale barcode scanner",
    "authenticity check",
  ],
  openGraph: {
    type: "website",
    url: "https://spadas.ai",
    title: "Reseller Scanner - Spadas Lens: eBay Barcode & Profit Calculator",
    description:
      "Instant optical scanner & AI reseller copilot. Scan barcodes & thrift shelves in 0.5s, calculate net profit with live eBay, Poshmark & Mercari sold comps, and generate ready-to-post listings.",
    siteName: "Spadas Lens",
    images: [
      {
        url: "https://spadas.ai/og-preview.jpg",
        width: 1200,
        height: 630,
        alt: "Reseller Scanner - Spadas Lens — Live Optical Scanner & Profit Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reseller Scanner - Spadas Lens: eBay Barcode & Profit Calculator",
    description:
      "Instant optical scanner & AI reseller copilot. Scan barcodes & thrift shelves in 0.5s, calculate net profit with live eBay, Poshmark & Mercari sold comps, and generate ready-to-post listings.",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark font-sans", geistSans.variable, geistMono.variable)}>
      <head>
        <link rel="canonical" href="https://spadas.ai" />
        <link rel="preload" href="/icon-192.png" as="image" type="image/png" />
        <link rel="dns-prefetch" href="https://i.ebayimg.com" />
        <link rel="preconnect" href="https://i.ebayimg.com" crossOrigin="anonymous" />
        <meta property="og:image" content="https://spadas.ai/og-preview.jpg" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Reseller Scanner - Spadas Lens",
              operatingSystem: "Android, iOS, Web",
              applicationCategory: "BusinessApplication",
              applicationSubCategory: "ShoppingApplication",
              url: "https://spadas.ai",
              image: "https://spadas.ai/icon-512.png",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "128",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "10 free scans daily. Unlimited tier available.",
              },
              description:
                "Instant optical scanner & AI reseller copilot. Scan barcodes & thrift shelves in 0.5s, calculate net profit with live eBay, Poshmark & Mercari sold comps, and generate ready-to-post listings.",
              featureList: [
                "Instant 60fps barcode & shelf camera scanner",
                "Real eBay, Poshmark, Mercari & Depop sold comps",
                "Net profit calculator factoring platform fees & shipping",
                "1-click AI listing generator from photos",
                "Cross-listing inventory management",
              ],
            }),
          }}
        />
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
        <SpeedInsights sampleRate={1} />
        <WebVitals />
        <Toaster position="bottom-right" richColors closeButton />
        {/* Google tag (gtag.js) deferred to non-blocking afterInteractive execution */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18430569894"
          strategy="afterInteractive"
        />
        <Script id="google-gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18430569894');
          `}
        </Script>
      </body>
    </html>
  );
}
