"use client";

import { useState } from "react";
import { ChevronDown, Star, Download, ShieldCheck, HelpCircle, MessageSquare } from "lucide-react";
import Link from "next/link";

const testimonials = [
  {
    quote: "Spadas Lens AR camera scanner cut my sourcing research time in half. I can scan a whole shelf of thrift clothing and know instantly what's worth buying.",
    name: "Alex M.",
    role: "eBay PowerSeller",
    avatar: "🛍️",
    badge: "$14K/mo volume",
  },
  {
    quote: "The AI listing generator creates perfect title descriptions with relevant keywords for Depop and Poshmark in seconds. Game changer for inventory turnover.",
    name: "Sarah T.",
    role: "Depop Top Seller",
    avatar: "👗",
    badge: "500+ Items Sold",
  },
  {
    quote: "Finally a tool that accurately calculates my net profits after platform fees, cost of goods, and shipping. No more spreadsheet headaches.",
    name: "Marcus K.",
    role: "Multi-Platform Reseller",
    avatar: "📦",
    badge: "4.9 ★ Rating",
  },
];

const faqs = [
  {
    q: "How does the Spadas Lens AR Camera Scanner work?",
    a: "Spadas Lens uses AI Computer Vision and real-time barcode detection to scan products directly through your smartphone camera. It instantly cross-references live eBay comps and market sales data to show estimated resale values and ROI margins.",
  },
  {
    q: "Which marketplaces are supported?",
    a: "Spadas AI generates listings and tracks profits across all major resale platforms including eBay, Poshmark, Depop, Mercari, and Facebook Marketplace.",
  },
  {
    q: "How do I install the Android APK app on my device?",
    a: "You can download the official signed Android APK (Spadas-AI.apk) directly from our website homepage or via APKPure and Itch.io. Open the file on your device and tap Install to run natively.",
  },
  {
    q: "Is Spadas AI free to start?",
    a: "Yes! You can sign up for a free account to track inventory, generate AI listings, and test Spadas Lens scanning right away.",
  },
];

export default function LandingTestimonialsFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="space-y-20 py-16 border-t border-white/10">
      {/* Testimonials */}
      <section>
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            Loved by Resellers
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white md:text-5xl">
            Trusted by top sellers everywhere
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-blue-500/30"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-300 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/20 text-xl border border-blue-400/30">
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{t.name}</h4>
                    <p className="text-xs text-slate-400">{t.role}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                  {t.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-300 backdrop-blur-sm">
            <HelpCircle className="h-3.5 w-3.5" />
            Frequently Asked Questions
          </div>
          <h2 className="mt-4 text-3xl font-extrabold text-white">
            Everything you need to know
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-slate-900/60 transition overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-base font-semibold text-white hover:text-blue-300 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-blue-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm leading-relaxed text-slate-300 border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Media Press Kit Banner */}
      <section className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" /> Media & Partner Press Kit
          </div>
          <h3 className="text-2xl font-bold text-white">
            Need official app logos, banners & store graphics?
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Download our full media press kit containing high-res icons, store feature graphics, mobile screenshots, and APK binaries.
          </p>
        </div>

        <Link
          href="/press"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500 shrink-0"
        >
          <Download className="h-4 w-4" /> Download Press Kit Assets
        </Link>
      </section>
    </div>
  );
}
