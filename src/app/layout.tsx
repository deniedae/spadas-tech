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
import { SITE_URL, IS_PREVIEW_DEPLOYMENT } from "@/lib/site-url";

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
    "Optical scanner & sold comps app for thrift resellers. Scan items in thrift stores, yard sales & op shops with verified eBay sold comps, net profit calculation after fees & shipping, and fast listing.",
  metadataBase: new URL(SITE_URL),
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
    url: SITE_URL,
    title: "Thrift Comps: Resale Scanner & Profit App",
    description:
      "Instant optical scanner & sold comps app for thrift resellers. Scan thrift finds instantly, calculate true net profit with live eBay sold comps, and cross-list in seconds.",
    siteName: "Thrift Comps: Resale Scanner",
    images: [
      {
        url: `${SITE_URL}/og-preview.jpg`,
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
    images: [`${SITE_URL}/og-preview.jpg`],
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
    index: !IS_PREVIEW_DEPLOYMENT,
    follow: !IS_PREVIEW_DEPLOYMENT,
    googleBot: {
      index: !IS_PREVIEW_DEPLOYMENT,
      follow: !IS_PREVIEW_DEPLOYMENT,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
  maximumScale: 5,
  userScalable: true,
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
        {/* Google AdSense Site Verification Meta Tag */}
        <meta name="google-adsense-account" content="ca-pub-5362745474137454" />
        {/* Google AdSense Script Tag (Publisher ID: pub-5362745474137454) */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5362745474137454"
          crossOrigin="anonymous"
        ></script>
        <link rel="preload" href="/icon-192.png" as="image" type="image/png" />
        <link rel="dns-prefetch" href="https://i.ebayimg.com" />
        <link rel="preconnect" href="https://i.ebayimg.com" crossOrigin="anonymous" />
        <meta property="og:image" content={`${SITE_URL}/og-preview.jpg`} />
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
              name: "Spadas Resale Scanner",
              operatingSystem: "Android, iOS, Web",
              applicationCategory: "BusinessApplication",
              applicationSubCategory: "ShoppingApplication",
              url: SITE_URL,
              image: `${SITE_URL}/icon-512.png`,
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
                description: "3 free scans to test. Unlimited tier available.",
              },
              description:
                "Optical scanner & sold comps app for thrift resellers. Scan barcodes & thrift finds, calculate net profit with live eBay sold comps, and generate ready-to-post listings.",
              featureList: [
                "Camera & barcode scanner with instant optical recognition",
                "Real completed eBay sold comps with outlier IQR trimming",
                "Net profit calculator factoring selling fees & parcel postage",
                "Ready-to-post listing generator",
                "Inventory haul tracking and CSV export",
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
