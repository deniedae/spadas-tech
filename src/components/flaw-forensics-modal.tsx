"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Camera,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import {
  FlawItem,
  FlawCategory,
  FlawSeverity,
  FLAW_CATEGORY_META,
  generateDisputeProofAppraisal,
  detectFlawsFromText,
} from "@/lib/flaw-forensics-engine";

interface FlawForensicsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle?: string;
  initialDescription?: string;
  initialCondition?: string;
  photos?: string[];
  onApplyShield: (result: {
    recommendedCondition: string;
    conditionDescriptor: string;
    updatedDescription: string;
  }) => void;
}

export function FlawForensicsModal({
  isOpen,
  onClose,
  itemTitle = "Item",
  initialDescription = "",
  initialCondition = "Used - Good",
  photos = [],
  onApplyShield,
}: FlawForensicsModalProps) {
  const [flaws, setFlaws] = useState<FlawItem[]>(() => {
    return detectFlawsFromText(initialDescription);
  });

  const [selectedCategory, setSelectedCategory] = useState<FlawCategory>("stain");
  const [selectedSeverity, setSelectedSeverity] = useState<FlawSeverity>("minor");
  const [selectedLocation, setSelectedLocation] = useState("Front lower hem");
  const [selectedNotes, setSelectedNotes] = useState("");
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState<number>(0);

  useEffect(() => {
    if (isOpen && flaws.length === 0 && initialDescription) {
      const auto = detectFlawsFromText(initialDescription);
      if (auto.length > 0) setFlaws(auto);
    }
  }, [isOpen, initialDescription]);

  const appraisal = generateDisputeProofAppraisal(flaws, itemTitle, initialCondition);

  if (!isOpen) return null;

  const handleAddFlaw = () => {
    triggerTactileHaptic("selection");
    const newFlaw: FlawItem = {
      id: `flaw-${Date.now()}`,
      category: selectedCategory,
      severity: selectedSeverity,
      location: selectedLocation.trim() || FLAW_CATEGORY_META[selectedCategory].defaultLocation,
      notes: selectedNotes.trim(),
      photoIndex: photos.length > 0 ? selectedPhotoIdx : undefined,
    };
    setFlaws((prev) => [...prev, newFlaw]);
    setSelectedNotes("");
    toast.success(`Disclosed ${FLAW_CATEGORY_META[selectedCategory].label}`);
  };

  const handleRemoveFlaw = (id: string) => {
    triggerTactileHaptic("light");
    setFlaws((prev) => prev.filter((f) => f.id !== id));
  };

  const handleApply = () => {
    triggerTactileHaptic("success");
    // Ensure we don't duplicate disclosure disclaimer if already present
    const baseDesc = initialDescription.split("--- 🛡️ VERIFIED CONDITION")[0].trim();
    const updatedDescription = `${baseDesc}${appraisal.disputeProofDisclaimer}`.trim();

    onApplyShield({
      recommendedCondition: appraisal.recommendedCondition,
      conditionDescriptor: appraisal.conditionDescriptor,
      updatedDescription,
    });

    toast.success("🛡️ Dispute-Proof Flaw Shield applied to listing!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-950 border border-slate-800 text-white overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>AI Flaw &amp; Defect Forensics</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  INAD Shield
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Disclose micro-flaws to eliminate &quot;Item Not As Described&quot; eBay return claims.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar">
          {/* Risk Level Telemetry Strip */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              appraisal.ebayInadRiskScore === "LOW"
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : appraisal.ebayInadRiskScore === "MODERATE"
                ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                : "bg-rose-950/30 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {appraisal.ebayInadRiskScore === "LOW" ? (
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-black uppercase tracking-wider block">
                  {appraisal.ebayInadRiskScore === "LOW"
                    ? "INAD Dispute Risk: Minimal (Protected)"
                    : appraisal.ebayInadRiskScore === "MODERATE"
                    ? "INAD Dispute Risk: Moderate (Full Disclosure Recommended)"
                    : "INAD Dispute Risk: High (Must Disclose / For Parts)"}
                </span>
                <span className="text-[11px] opacity-80">
                  {flaws.length === 0
                    ? "0 flaws recorded · Certified clean pre-owned standard."
                    : `${flaws.length} flaw(s) transparently mapped and disclosed.`}
                </span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-mono block opacity-70">Grade</span>
              <span className="text-xs font-black">{appraisal.recommendedCondition}</span>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">Select Defect Type to Log</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.keys(FLAW_CATEGORY_META) as FlawCategory[]).map((cat) => {
                const meta = FLAW_CATEGORY_META[cat];
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      triggerTactileHaptic("light");
                      setSelectedCategory(cat);
                      setSelectedLocation(meta.defaultLocation);
                    }}
                    className={`p-2 rounded-xl border text-left transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md scale-[1.02]"
                        : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm">{meta.icon}</span>
                    <span className="text-[11px] font-bold truncate">{meta.label.split("/")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Defect Details Form */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Severity */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Severity</label>
                <div className="flex rounded-xl bg-slate-950 p-0.5 border border-slate-800">
                  {(["minor", "moderate", "significant"] as FlawSeverity[]).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setSelectedSeverity(sev)}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold capitalize transition cursor-pointer ${
                        selectedSeverity === sev
                          ? "bg-slate-800 text-white"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Location</label>
                <input
                  type="text"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  placeholder="e.g. Front hem"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Note and Photo Linking */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Notes / Details</label>
                <input
                  type="text"
                  value={selectedNotes}
                  onChange={(e) => setSelectedNotes(e.target.value)}
                  placeholder="e.g. 2mm faint mark, easily washed"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {photos.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400">Linked Photo Callout</label>
                  <select
                    value={selectedPhotoIdx}
                    onChange={(e) => setSelectedPhotoIdx(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {photos.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Photo #{idx + 1} {idx === 0 ? "(Main)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddFlaw}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log Disclosed Flaw</span>
            </button>
          </div>

          {/* Active Logged Flaws List */}
          {flaws.length > 0 ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                <span>Disclosed Defects ({flaws.length})</span>
                <span className="text-[10px] text-emerald-400 font-mono">100% Transparency</span>
              </label>

              <div className="space-y-1.5">
                {flaws.map((flaw) => {
                  const meta = FLAW_CATEGORY_META[flaw.category];
                  return (
                    <div
                      key={flaw.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{meta.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white truncate">{meta.label}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 capitalize">
                              {flaw.severity}
                            </span>
                            {typeof flaw.photoIndex === "number" && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                Photo #{flaw.photoIndex + 1}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {flaw.location} {flaw.notes ? `• ${flaw.notes}` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFlaw(flaw.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer shrink-0"
                        title="Remove flaw"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
              <span className="text-xs text-slate-400">
                No defects logged. Clean item statement will be applied.
              </span>
            </div>
          )}

          {/* Generated eBay Live Disclaimer Preview */}
          <div className="p-3 rounded-2xl bg-black/50 border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
              Dispute-Proof Notice Preview (Appended to Listing)
            </span>
            <pre className="text-[10px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
              {appraisal.disputeProofDisclaimer.trim()}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/50 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Apply INAD Shield</span>
          </button>
        </div>
      </div>
    </div>
  );
}
