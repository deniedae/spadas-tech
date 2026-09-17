"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  UserCheck,
  Send,
  Loader2,
  X,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface SupportTicket {
  ticketId: string;
  status: "open" | "awaiting_human" | "resolved";
  createdAt: number;
  issueDescription?: string;
}

const STORAGE_KEY = "spadas_support_desk_v1";

const DEFAULT_SUPPORT_PROMPT_CHIPS = [
  { label: "🇦🇺 How does AU comping work?", prompt: "How does the geo-strict eBay Australia comps engine work?" },
  { label: "🌐 What if an item is US-only?", prompt: "How does US-only comps fallback and scarcity pricing work?" },
  { label: "💰 P&L formula details?", prompt: "What exact fees and deductions are in the Net Profit calculation?" },
  { label: "🛒 How to publish to eBay?", prompt: "How do I connect and publish items directly to eBay AU?" },
  { label: "⚡ Starter vs Pro features?", prompt: "What are the key differences between the Starter and Pro plans?" },
];

export default function DashboardSupportDesk() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);

  // Developer escalation modal state
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [issueText, setIssueText] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (parsed.ticket) {
          setTicket(parsed.ticket);
        }
      } else {
        // Initial greeting
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "👋 Welcome to the **Spadas Support & Copilot Desk**! I'm your AI Resale Guide. Ask me anything about camera scanning, eBay AU sold comps, P&L formulas, or tap **[Request Developer Support]** if you need a human engineer.",
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {}
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (messages.length > 0 || ticket) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ messages, ticket, lastUpdated: Date.now() })
        );
      } catch {}
    }
  }, [messages, ticket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [isOpen, messages, isStreaming]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputMessage).trim();
    if (!textToSend || isStreaming) return;

    triggerTactileHaptic("selection");
    setInputMessage("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: Date.now(),
    };

    const assistantMsgId = `assistant-${Date.now()}`;
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { id: assistantMsgId, role: "assistant", content: "", timestamp: Date.now() }]);
    setIsStreaming(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to stream response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                streamedContent += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: streamedContent } : m
                  )
                );
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId && !m.content
            ? {
                ...m,
                content: "I'm having trouble connecting right now. Please tap **[Request Developer Support]** above to alert our engineering team.",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleEscalateToHuman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim() || isSubmittingTicket) return;

    setIsSubmittingTicket(true);
    triggerTactileHaptic("heavy");

    try {
      const res = await fetch("/api/support/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          userName,
          issueDescription: issueText,
          messages,
          metadata: {
            source: "dashboard_support_desk",
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
          },
        }),
      });

      const data = await res.json();
      if (data.ticketId) {
        const newTicket: SupportTicket = {
          ticketId: data.ticketId,
          status: "awaiting_human",
          createdAt: Date.now(),
          issueDescription: issueText,
        };
        setTicket(newTicket);
        setShowEscalationModal(false);

        // Append system confirmation message into chat
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: "system",
            content: `📢 **Ticket #${data.ticketId} Created**: Developer notified. You will receive an in-app reply or notification shortly.`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      console.error("Escalation failed:", err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <>
      {/* ── 1. Floating Support Bubble (Docked in Bottom Corner) ──────────────── */}
      <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => {
            triggerTactileHaptic("light");
            setIsOpen(true);
          }}
          className="group relative flex items-center gap-2.5 px-4 py-3 rounded-full bg-zinc-950 border border-cyan-500/40 text-white shadow-2xl hover:border-cyan-400 hover:shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer select-none backdrop-blur-md"
          title="Open Spadas Support & Copilot Desk"
        >
          <div className="relative flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-bold font-mono tracking-tight group-hover:text-cyan-300 transition">
            Support & Copilot Desk
          </span>
          {ticket?.status === "awaiting_human" && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Dev Active
            </span>
          )}
        </button>
      </div>

      {/* ── 2. Full Drawer / Modal Support Desk Interface ────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
          <div
            className="relative w-full max-w-lg h-[100dvh] max-h-[100dvh] sm:h-[680px] sm:max-h-[680px] flex flex-col rounded-t-3xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Handle */}
            <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-zinc-700 sm:hidden shrink-0" />

            {/* ── Header: Title + Status + Human Escalation Button ───────────── */}
            <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-zinc-850 bg-zinc-950">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                      Spadas Support Desk
                    </h3>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Live
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {ticket?.status === "awaiting_human" ? "Developer Standby (Ticket Active)" : "AI Assistant Online"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode 2: Request Developer Support Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerTactileHaptic("medium");
                    setShowEscalationModal(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    ticket?.status === "awaiting_human"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                      : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/25"
                  }`}
                  title="Escalate directly to a human developer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{ticket?.status === "awaiting_human" ? "Ticket Active" : "Request Dev"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                  title="Close Support Desk"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Persistent Ticket Status Banner (When Awaiting Human) ──────── */}
            {ticket?.status === "awaiting_human" && (
              <div className="p-2.5 px-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between gap-2 shrink-0 animate-fade-in">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="text-[11px] text-amber-300 font-medium truncate">
                    Developer notified. You will receive an in-app reply or notification shortly.
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold text-amber-400 shrink-0">
                  #{ticket.ticketId}
                </span>
              </div>
            )}

            {/* ── Messages Feed ──────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 relative overflow-y-auto overscroll-contain p-4 space-y-3 custom-scrollbar text-xs">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.role === "user" ? "justify-end" : m.role === "system" ? "justify-center" : "justify-start"}`}
                >
                  {m.role === "system" ? (
                    <div className="max-w-[90%] rounded-xl px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{m.content}</span>
                    </div>
                  ) : (
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed break-words ${
                        m.role === "user"
                          ? "bg-cyan-500 text-black font-medium rounded-br-xs"
                          : "bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-xs"
                      }`}
                    >
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
                            <span>Consulting platform specialist…</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Bottom Input & Chips Container ─────────────────────────────── */}
            <div className="shrink-0" style={{ transition: "none" }}>
              {/* Quick Prompt Chips */}
              <div className="px-3 py-1.5 border-t border-zinc-850 bg-zinc-950 overflow-x-auto custom-scrollbar flex items-center gap-1.5">
                {DEFAULT_SUPPORT_PROMPT_CHIPS.map((chip) => (
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

              {/* Text Input Form */}
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
                    placeholder="Ask support about scans, comps, P&L, plans..."
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
      )}

      {/* ── 3. Developer Escalation Modal ───────────────────────────────────── */}
      {showEscalationModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">Talk to a Developer</h4>
                  <p className="text-[11px] text-zinc-400">Direct engineering escalation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEscalationModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEscalateToHuman} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Alex Reseller"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Email for Follow-up</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Describe Issue or Request</label>
                <textarea
                  required
                  rows={3}
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  placeholder="Tell our developers what happened or what custom feature you need..."
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEscalationModal(false)}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingTicket ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Notify Developer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
