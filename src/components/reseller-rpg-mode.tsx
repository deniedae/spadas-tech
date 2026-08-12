"use client";

import React, { useState, useEffect } from "react";
import { Shield, Sparkles, Trophy, Award, Zap, Gift, CheckCircle2, Flame } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/app/lib/listings";

export interface Quest {
  id: string;
  title: string;
  xpReward: number;
  progress: number;
  totalRequired: number;
  completed: boolean;
}

const INITIAL_QUESTS: Quest[] = [
  { id: "q1", title: "Scan 3 items with Spadas Lens AR", xpReward: 150, progress: 2, totalRequired: 3, completed: false },
  { id: "q2", title: "Find an item with $50+ AUD net profit", xpReward: 300, progress: 1, totalRequired: 1, completed: true },
  { id: "q3", title: "Export a 9:16 TikTok Story video card", xpReward: 200, progress: 0, totalRequired: 1, completed: false },
];

export default function ResellerRpgMode() {
  const [level, setLevel] = useState<number>(7);
  const [currentXp, setCurrentXp] = useState<number>(1850);
  const [nextLevelXp] = useState<number>(2500);
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);
  const [lootChestAvailable, setLootChestAvailable] = useState<boolean>(true);

  const xpPct = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));

  const handleOpenLootChest = () => {
    if (!lootChestAvailable) return;
    setLootChestAvailable(false);
    const bonusXp = 250;
    setCurrentXp((prev) => prev + bonusXp);
    toast.success(`🎁 LOOT CHEST UNLOCKED! Earned +${bonusXp} XP & +5 Free AI Vision Credits!`);

    // Trigger 20ms haptic feedback
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([20, 50, 20]); } catch {}
    }
  };

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-6 md:p-8 space-y-6 shadow-2xl overflow-hidden box-border max-w-full select-none">
      {/* RPG Header & Reseller Level Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.5)] font-black text-xl border-2 border-amber-200 shrink-0">
            Lvl {level}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-0.5 text-[10px] font-black text-amber-300">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span>MASTER THRIFT HUNTER RANK</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 flex items-center gap-2">
              <span>IRL Reseller RPG Mode</span>
              <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            </h2>
          </div>
        </div>

        {/* Loot Chest Button */}
        <button
          type="button"
          onClick={handleOpenLootChest}
          disabled={!lootChestAvailable}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition cursor-pointer shrink-0 border ${
            lootChestAvailable
              ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 border-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce active:scale-95"
              : "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <Gift className="h-4 w-4" />
          <span>{lootChestAvailable ? "🎁 Open Daily Loot Chest (+250 XP)" : "✅ Loot Chest Claimed"}</span>
        </button>
      </div>

      {/* Level XP Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span>Level {level} XP Progress</span>
          <span className="text-amber-400 font-extrabold">{currentXp} / {nextLevelXp} XP ({xpPct}%)</span>
        </div>
        <div className="h-3.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden p-0.5">
          <div
            style={{ width: `${xpPct}%` }}
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
          />
        </div>
      </div>

      {/* Daily Quests List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Award className="h-4 w-4 text-amber-400" /> Daily Reseller Quests:
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quests.map((q) => (
            <div
              key={q.id}
              className={`rounded-2xl border p-4 space-y-2.5 transition ${
                q.completed
                  ? "border-emerald-500/40 bg-emerald-500/10 shadow-sm"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-white line-clamp-2">{q.title}</span>
                {q.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <span className="text-[10px] font-black text-amber-400 shrink-0">+{q.xpReward} XP</span>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Progress: {q.progress} / {q.totalRequired}</span>
                {q.completed && <span className="text-emerald-400 font-extrabold">COMPLETED</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
