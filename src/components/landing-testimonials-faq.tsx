"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle, Scan, ShieldCheck, Zap } from "lucide-react";

const faqs = [
  {
    q: "How does the Spadas Lens AR Camera Scanner work?",
    a: "Spadas Lens uses on-device computer vision and optical recognition to identify items directly through your camera at up to 60 FPS. It cross-references live eBay sold transactions, calculating realistic sell-through rate (STR%) and net profit after shipping and fees before you spend capital.",
  },
  {
    q: "Which marketplaces are supported?",
    a: "Spadas Lens benchmarks pricing and sold comps across eBay (Australia, US, UK, EU) and supports formatted cross-listing data for Facebook Marketplace, Depop, and Poshmark.",
  },
  {
    q: "How does turnover velocity prevent buying bad stock?",
    a: "The algorithm calculates 90-day sold volume divided by total active supply. Items with low turnover (<15% STR) are flagged as high-risk hoarder traps, while fast movers (>100% STR) trigger high-velocity alerts.",
  },
  {
    q: "How do I install the native Android APK?",
    a: "You can download the official signed Android APK (~982 KB) directly from our website. Open the APK on your Android device and tap Install for 60 FPS hardware acceleration and Home Screen profit widgets.",
  },
];

export default function LandingTestimonialsFaq() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl py-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-zinc-900/80 px-3 py-1 text-[11px] font-mono text-zinc-400">
          <HelpCircle className="h-3 w-3 text-cyan-400" />
          <span>SYSTEM ARCHITECTURE & FAQ</span>
        </div>
        <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-white">
          Frequently Asked Questions
        </h2>
      </div>

      <div className="space-y-2">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-white/[0.08] bg-[#0A0D15]/80 transition overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left text-xs font-semibold text-white hover:text-cyan-300 transition cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform shrink-0 ml-2 ${
                    isOpen ? "rotate-180 text-cyan-400" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs leading-relaxed text-zinc-400 border-t border-white/[0.04] pt-2.5 font-sans">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
