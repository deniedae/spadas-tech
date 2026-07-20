import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/sidebar";
import { Analytics } from "@vercel/analytics/next"
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
  <body className="bg-gray-100 text-gray-900">
  <div className="flex">
    <Sidebar />

    <main className="flex-1 p-8">
      {children}
    </main>
  </div>
  <Analytics />
</body>
    </html>
  );
}