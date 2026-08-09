"use client";

import React, { useState } from "react";
import { Send, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function CreatorApplicationForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="text-2xl font-bold text-white">Application Received!</h3>
        <p className="text-sm text-slate-300 max-w-md mx-auto">
          Thank you for applying. Our creator team will review your channel and contact you within 24 hours with your VIP onboarding kit and custom promo code.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Creator / Business Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Thrift King Flipping"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Primary Email</label>
          <input
            type="email"
            required
            placeholder="you@creator.com"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Primary Channel Link (YouTube / TikTok / IG)</label>
          <input
            type="url"
            required
            placeholder="https://youtube.com/@channel"
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2">Estimated Subscriber / Follower Count</label>
          <select className="w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none">
            <option value="1-5k">1,000 - 5,000 followers</option>
            <option value="5-25k">5,000 - 25,000 followers</option>
            <option value="25-100k">25,000 - 100,000 followers</option>
            <option value="100k+">100,000+ followers</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">Sponsorship Preference</label>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
            <input type="radio" name="pref" defaultChecked className="text-blue-600" />
            <span>25% Lifetime Affiliate</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
            <input type="radio" name="pref" className="text-blue-600" />
            <span>Flat Fee per Video</span>
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300 cursor-pointer hover:border-slate-700">
            <input type="radio" name="pref" className="text-blue-600" />
            <span>Hybrid (Flat + % Commission)</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
      >
        <Send className="h-4 w-4" /> Submit Sponsorship Application
      </button>

      <p className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Approved creators receive instant access to custom promo codes & asset kits.
      </p>
    </form>
  );
}
