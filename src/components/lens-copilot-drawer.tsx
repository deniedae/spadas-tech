"use client";

import React, { useState, useRef, useEffect, useMemo, useTransition } from "react";
import {
  Sparkles,
  X,
  Send,
  CornerDownLeft,
  ShoppingBag,
  Tag,
  Zap,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { fmtMoney, formatAUD } from "@/app/lib/listings";
import type { RawSoldComp } from "@/types/lens";

export interface LensCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  itemContext: {
    title: string;
    brand?: string | null;
    category?: string | null;
    condition?: string | null;
    mediaFormat?: '4K UHD' | 'Blu-ray' | 'DVD' | 'Steelbook' | 'VHS' | 'Cassette' | 'CD' | 'Vinyl';
    tagPrice?: number;
    fairMarketPrice?: number;
    estimatedNet?: number;
    comps?: RawSoldComp[];
    liquidNotes?: string;
    thumbnail?: string | null;
    isUsMarketOnly?: boolean;
    usMedianUsd?: number;
    arbitrageSignal?: string;
    sellThroughRate?: string | number;
    liquiditySpeed?: string;
  };
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const BASE_QUICK_PROMPT_CHIPS = [
  { label: "🎯 80-Char SEO Title", prompt: "Generate a high-ranking 80-character eBay SEO title front-loading brand, model, specs, and keywords." },
  { label: "🏷️ Best Offer Brackets", prompt: "Give me an actionable pricing strategy with Buy It Now price, Best Offer auto-accept, and auto-decline thresholds." },
  { label: "🔍 Authenticity Checklist", prompt: "Give me category-specific inspection steps (batch codes, materials, stitch counts, serials) to check right now." },
  { label: "⚡ Local Flip vs eBay", prompt: "Should I fast-flip locally on FB Marketplace/Gumtree for cash or hold for national eBay AU buyers?" },
  { label: "💡 Fair tag price?", prompt: "Is the tag price fair, or what is the maximum counter-offer I should make?" },
];

export default function LensCopilotDrawer({
  isOpen,
  onClose,
  itemContext,
}: LensCopilotDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom as streaming tokens arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Completely hide the bottom navigation bar when Copilot drawer mounts
  useEffect(() => {
    if (!isOpen) return;
    document.body.setAttribute("data-copilot-open", "true");
    document.body.classList.add("copilot-drawer-open");
    return () => {
      document.body.removeAttribute("data-copilot-open");
      document.body.classList.remove("copilot-drawer-open");
    };
  }, [isOpen]);


  // Dynamically configure prompt chips including US Scarcity Strategy when applicable
  const activeChips = useMemo<{ label: string; prompt: string }[]>(() => {
    const list: { label: string; prompt: string }[] = [...BASE_QUICK_PROMPT_CHIPS];
    if (itemContext.isUsMarketOnly) {
      list.unshift({
        label: "🌐 US Scarcity Strategy",
        prompt: "No AU comps exist. How should I price this for domestic Australian scarcity or international export?",
      });
    }
    return list;
  }, [itemContext.isUsMarketOnly]);

  // Initial greeting seed whenever a new item is opened
  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        const net = itemContext.estimatedNet ?? 0;
        const verdict = net >= 20 ? "looks like a strong COP" : net >= 8 ? "has moderate margin" : "is RISKY";
        const formattedTag = fmtMoney(itemContext.tagPrice || 10);
        const formattedNet = formatAUD(net);
        const usNote = itemContext.isUsMarketOnly
          ? ` 🇺🇸 **US Market Data Only** (${itemContext.arbitrageSignal || "No AU sales recorded; high US liquidity"}).`
          : "";
        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: `I've loaded the comps for **${itemContext.title.slice(0, 45)}**. At ${formattedTag} tag price and ~${formattedNet} net profit, this ${verdict}.${usNote} What do you need to know?`,
          },
        ]);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen, itemContext]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isStreaming) return;

    triggerTactileHaptic("selection");
    setInputMessage("");
    setStreamError(null);

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: "user", content: textToSend },
    ];

    setMessages(newMessages);
    setIsStreaming(true);

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Append empty placeholder for streaming response
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      // Build lightweight structured payload — NO full image payloads sent
      const payload = {
        messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        itemContext: {
          title: itemContext.title,
          brand: itemContext.brand,
          category: itemContext.category,
          condition: itemContext.condition,
          media_format: itemContext.mediaFormat,
          tag_price: itemContext.tagPrice,
          fair_market_price: itemContext.fairMarketPrice,
          estimated_net: itemContext.estimatedNet,
          liquid_notes: itemContext.liquidNotes,
          is_us_market_only: itemContext.isUsMarketOnly,
          us_median_usd: itemContext.usMedianUsd,
          arbitrage_signal: itemContext.arbitrageSignal,
          sell_through_rate: itemContext.sellThroughRate,
          liquidity_speed: itemContext.liquiditySpeed,
          comps: (itemContext.comps || []).slice(0, 3).map((c) => ({
            title: c.title,
            price: c.price,
            date: c.soldDate,
          })),
        },
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Chat error (${res.status})`);
      }

      if (!res.body) {
        throw new Error("No response stream from server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const dataStr = trimmed.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: m.content + parsed.text } : m
                )
              );
            }
          } catch {
            // non-json keepalive chunk
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.warn("[Copilot Drawer] Stream error:", err);
      setStreamError("Failed to reach Copilot. Please check connection.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? { ...m, content: "Could not fetch advice. Please try tapping a quick prompt chip again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-fade-in select-none">
      <div
        className="relative w-full max-w-md h-[100dvh] max-h-[100dvh] sm:h-[620px] sm:max-h-[620px] flex flex-col rounded-t-3xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-zinc-700 sm:hidden shrink-0" />

        {/* ── Top Header / Item Identifier ──────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                  Spadas Sourcing Copilot
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  AI Edge
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                {itemContext.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {typeof itemContext.estimatedNet === "number" && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold border tabular-nums ${
                  itemContext.estimatedNet >= 0
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                }`}
              >
                {formatAUD(itemContext.estimatedNet)} Net
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
              title="Close Copilot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Chat Messages Feed ────────────────────────────────────────────── */}
        <div className="copilot-feed flex-1 min-h-0 relative overflow-y-auto overscroll-contain p-3.5 space-y-3 custom-scrollbar text-xs">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed break-words ${
                  m.role === "user"
                    ? "bg-cyan-500 text-black font-medium rounded-br-xs"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-xs"
                }`}
              >
                {/* Parse simple markdown bold */}
                <div className="whitespace-pre-wrap">
                  {m.content ? (
                    m.content.split("**").map((part, i) =>
                      i % 2 === 1 ? (
                        <strong key={i} className="font-bold text-white">
                          {part}
                        </strong>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )
                  ) : isStreaming && m.role === "assistant" ? (
                    <span className="inline-flex items-center gap-1 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>Analyzing item…</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {streamError && (
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{streamError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Bottom Input & Chips Container (Pure Flexbox Anchor) ──────────── */}
        <div className="copilot-input-container shrink-0" style={{ transition: "none", transform: "none" }}>
          {/* ── Suggested Quick Prompt Chips (1-Tap Sourcing Queries) ─────────── */}
          <div className="px-3 py-1.5 border-t border-zinc-850 bg-zinc-950 overflow-x-auto custom-scrollbar flex items-center gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                disabled={isStreaming}
                onClick={() => handleSendMessage(chip.prompt)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 hover:bg-zinc-850 text-zinc-300 hover:text-white transition whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* ── Text Input Field ──────────────────────────────────────────────── */}
          <div className="p-3 border-t border-zinc-800 bg-zinc-950 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onFocus={() => {
                  setTimeout(scrollToBottom, 150);
                }}
                placeholder="Ask Copilot (e.g., Should I offer $8?)..."
                disabled={isStreaming}
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500 transition"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isStreaming}
                className="h-9 px-3 rounded-xl bg-cyan-500 text-black font-bold text-xs hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                title="Send Message"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
