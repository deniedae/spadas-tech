import type { Metadata } from "next";
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
  title: "SpadasTechnology",
  description: "AI-powered reseller platform",
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
