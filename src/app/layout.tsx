import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import LayoutClient from "@/components/layout-client";
import { GlobalFirstLaunchFlow } from "@/components/global-first-launch-flow";
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
    default: "Thrift Comps: Resale Scanner & Profit App",
    template: "%s · Thrift Comps: Resale Scanner",
  },
  description:
    "The #1 optical scanner & sold comps app for thrift resellers. Scan thrift stores, yard sales & op shops instantly. Get verified eBay sold comps, calculate true net profit after fees & shipping, and cross-list in seconds.",
  metadataBase: new URL("https://spadas.ai"),
  applicationName: "Thrift Comps: Resale Scanner",
  authors: [{ name: "Spadas Tech" }],
  keywords: [
    "thrift comps",
    "resale scanner",
    "thrift scanner",
    "resale comps",
    "thrift profit calculator",
    "ebay sold comps scanner",
    "ebay reseller scanner",
    "reseller price checker",
    "reselling scanner app",
    "thrift flip profit scanner",
    "ebay sold listings scanner",
    "garage sale barcode scanner",
    "ebay profit calculator",
    "vintage clothing scanner",
    "poshmark mercari depop crosslister",
    "spadas lens",
    "retail arbitrage barcode scanner",
  ],
  openGraph: {
    type: "website",
    url: "https://spadas.ai",
    title: "Thrift Comps: Resale Scanner & Profit App",
    description:
      "Instant optical scanner & sold comps app for thrift resellers. Scan thrift finds instantly, calculate true net profit with live eBay sold comps, and cross-list in seconds.",
    siteName: "Thrift Comps: Resale Scanner",
    images: [
      {
        url: "https://spadas.ai/og-preview.jpg",
        width: 1200,
        height: 630,
        alt: "eBay Reseller Scanner: Thrift Profit & Sold Comps App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "eBay Reseller Scanner: Thrift Profit & Sold Comps App",
    description:
      "Instant optical AR scanner & barcode reader for eBay resellers. Scan thrift finds instantly, calculate true net profit with live eBay US & Australia sold comps, and cross-list in seconds.",
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
  robots: {
    index: true,
    follow: true,
  },
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
        {/* Google AdSense Verification & Auto-Ads Tag (Publisher ID: pub-7262955524032732) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7262955524032732"
          crossOrigin="anonymous"
        />
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
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "3 free scans to test. Unlimited tier available.",
              },
              description:
                "Instant optical scanner & AI reseller copilot. Scan barcodes & thrift shelves instantly, calculate net profit with live eBay Australia, Depop & Gumtree sold comps, and generate ready-to-post listings.",
              featureList: [
                "Instant 60fps barcode & shelf camera scanner",
                "Real eBay Australia, Depop AU & Gumtree sold comps",
                "Net profit calculator factoring Australian platform fees & AusPost shipping",
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
        <GlobalFirstLaunchFlow />
        <LayoutClient>{children}</LayoutClient>
        <Analytics />
        <SpeedInsights sampleRate={1} />
        <WebVitals />
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
        {/* Google Identity Services / One-Tap */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
