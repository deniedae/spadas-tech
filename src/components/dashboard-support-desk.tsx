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
  Mail,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Inbox,
  Clock,
} from "lucide-react";
import { triggerTactileHaptic } from "@/lib/android-bridge";
import { toast } from "sonner";
import { supabase } from "@/app/lib/supabase";
import { isOwnerEmail } from "@/app/lib/auth-admin";
import type { SupportTicketRecord } from "@/app/lib/support-tickets";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface SupportTicket {
  ticketId: string;
  status: "open" | "awaiting_human" | "answered" | "resolved";
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

export interface DashboardSupportDeskProps {
  hideFloatingButton?: boolean;
  autoOpenOnMount?: boolean;
}

export function openSpadasSupport(options?: { mode?: "chat" | "escalate" | "inbox"; prompt?: string }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("spadas:open-support", { detail: options }));
  }
}

export default function DashboardSupportDesk({
  hideFloatingButton = false,
  autoOpenOnMount = false,
}: DashboardSupportDeskProps = {}) {
  const [isOpen, setIsOpen] = useState(autoOpenOnMount);
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

  // Owner / Developer state
  const [isDeveloperOwner, setIsDeveloperOwner] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "developer_inbox">("chat");
  const [developerTickets, setDeveloperTickets] = useState<SupportTicketRecord[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | "awaiting" | "resolved">("all");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
  const [expandedChatTicketId, setExpandedChatTicketId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Check if current user is developer/owner
  useEffect(() => {
    async function checkOwnerStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let email = session?.user?.email;
        if (!email) {
          const { data } = await supabase.auth.getUser();
          email = data.user?.email;
        }
        if (email && isOwnerEmail(email)) {
          setIsDeveloperOwner(true);
        }
      } catch {}
    }
    void checkOwnerStatus();
  }, []);

  // Listen for programmatic open requests and URL hash/query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (params.get("support") === "open" || hash === "#support-open") {
        setIsOpen(true);
      } else if (params.get("support") === "escalate" || hash === "#support-escalate") {
        setIsOpen(true);
        setShowEscalationModal(true);
      } else if (params.get("support") === "inbox" || hash === "#support-inbox") {
        setIsOpen(true);
        setActiveTab("developer_inbox");
      }
    }
  }, []);

  useEffect(() => {
    const handleOpenEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ mode?: "chat" | "escalate" | "inbox"; prompt?: string }>;
      setIsOpen(true);
      if (customEvent.detail?.mode === "escalate") {
        setShowEscalationModal(true);
      } else if (customEvent.detail?.mode === "inbox") {
        setActiveTab("developer_inbox");
      } else if (customEvent.detail?.mode === "chat") {
        setActiveTab("chat");
      }
      if (customEvent.detail?.prompt) {
        void handleSendMessage(customEvent.detail.prompt);
      }
    };

    window.addEventListener("spadas:open-support", handleOpenEvent);
    return () => {
      window.removeEventListener("spadas:open-support", handleOpenEvent);
    };
  }, []);

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

  // Auto scroll chat to bottom
  useEffect(() => {
    if (isOpen && activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isStreaming, activeTab]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && activeTab === "chat" && !showEscalationModal) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, activeTab, showEscalationModal]);

  // Fetch developer tickets if owner
  const fetchDeveloperTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch("/api/support/tickets", { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.tickets)) {
          setDeveloperTickets(data.tickets);
        }
      }
    } catch (err) {
      console.error("[SupportDesk] Failed to fetch developer tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isDeveloperOwner && (isOpen || activeTab === "developer_inbox")) {
      void fetchDeveloperTickets();
    }
  }, [isDeveloperOwner, isOpen, activeTab]);

  // Poll for developer reply for regular users with active ticket
  useEffect(() => {
    if (!ticket?.ticketId || isDeveloperOwner) return;

    let timer: NodeJS.Timeout;
    const checkTicketStatus = async () => {
      try {
        const res = await fetch(`/api/support/ticket-status?ticketId=${encodeURIComponent(ticket.ticketId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.ticket) {
          const t = data.ticket;
          if (t.developerReply) {
            setMessages((prev) => {
              const alreadyHas = prev.some(
                (m) => m.id === `dev-reply-${ticket.ticketId}` || (m.role === "assistant" && m.content.includes(t.developerReply))
              );
              if (alreadyHas) return prev;
              toast.success("New response from Spadas Developer!", { duration: 6000 });
              return [
                ...prev,
                {
                  id: `dev-reply-${ticket.ticketId}`,
                  role: "assistant",
                  content: `👨‍💻 **Direct Developer Response** (from Spadas Engineering / ${t.repliedBy || "deniedae@gmail.com"}):\n\n${t.developerReply}`,
                  timestamp: t.repliedAt || Date.now(),
                },
              ];
            });
            if (ticket.status !== t.status) {
              setTicket((prev) => (prev ? { ...prev, status: t.status } : null));
            }
          }
        }
      } catch {}
    };

    void checkTicketStatus();
    timer = setInterval(checkTicketStatus, 15000);
    return () => clearInterval(timer);
  }, [ticket?.ticketId, isDeveloperOwner]);

  // Handle sending a message to AI Copilot
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isStreaming) return;

    triggerTactileHaptic("light");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";
      const assistantMsgId = `a-${Date.now()}`;

      if (!reader) throw new Error("No readable stream received");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("data: ")) {
            const dataStr = trimmed.replace(/^data:\s*/, "").trim();
            if (dataStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                assistantText += parsed.text;
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              if (dataStr !== "[DONE]") {
                assistantText += dataStr;
              }
            }
          } else {
            assistantText += trimmed;
          }

          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== assistantMsgId);
            return [
              ...filtered,
              {
                id: assistantMsgId,
                role: "assistant",
                content: assistantText,
                timestamp: Date.now(),
              },
            ];
          });
        }
      }

      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) {
          const dataStr = trimmed.replace(/^data:\s*/, "").trim();
          if (dataStr !== "[DONE]") {
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) assistantText += parsed.text;
            } catch {
              assistantText += dataStr;
            }
          }
        } else {
          assistantText += trimmed;
        }

        setMessages((prev) => {
          const filtered = prev.filter((m) => m.id !== assistantMsgId);
          return [
            ...filtered,
            {
              id: assistantMsgId,
              role: "assistant",
              content: assistantText,
              timestamp: Date.now(),
            },
          ];
        });
      }
    } catch (err: any) {
      console.error("Support chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "system",
          content: "⚠️ I encountered an error answering that query. Tap **[Request Developer Support]** above to notify Spadas engineering directly.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  // Handle Developer Escalation submission
  const handleEscalateToHuman = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueText.trim() || !userEmail.trim()) return;

    setIsSubmittingTicket(true);
    triggerTactileHaptic("medium");

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
        toast.success(`Ticket #${data.ticketId} escalated to developer!`);
      }
    } catch (err) {
      console.error("Escalation failed:", err);
      toast.error("Failed to submit ticket. Please try again.");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Developer sends reply to user ticket
  const handleSendDeveloperReply = async (ticketId: string, markResolved: boolean = false) => {
    const replyText = replyDrafts[ticketId]?.trim();
    if (!replyText) {
      toast.error("Please enter a reply message");
      return;
    }

    setSubmittingReplyId(ticketId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ticketId,
          replyMessage: replyText,
          status: markResolved ? "resolved" : "answered",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Reply recorded for ticket #${ticketId}!`);
        setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
        void fetchDeveloperTickets();
      } else {
        toast.error(data.error || "Failed to record reply");
      }
    } catch (err) {
      console.error("Failed to send developer reply:", err);
      toast.error("Network error while recording reply");
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const unansweredCount = developerTickets.filter((t) => t.status === "awaiting_human" || t.status === "open").length;

  const filteredTickets = developerTickets.filter((t) => {
    if (filterStatus === "awaiting") return t.status === "awaiting_human" || t.status === "open";
    if (filterStatus === "resolved") return t.status === "resolved" || t.status === "answered";
    return true;
  });

  return (
    <>
      {/* ── 1. Floating Support Bubble (Docked in Bottom Corner) ──────────────── */}
      {!hideFloatingButton && (
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
              Support Desk
            </span>
            {isDeveloperOwner && unansweredCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-zinc-950">
                {unansweredCount} New
              </span>
            )}
            {!isDeveloperOwner && ticket?.status === "awaiting_human" && (
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Dev Standby
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── 2. Full Drawer / Modal Support Desk Interface ────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in select-none">
          <div
            className="relative w-full max-w-lg h-[100dvh] max-h-[100dvh] sm:h-[680px] sm:max-h-[680px] flex flex-col rounded-t-3xl sm:rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Pull Handle */}
            <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-zinc-700 sm:hidden shrink-0" />

            {/* ── Header: Title + Status + Action Buttons ───────────── */}
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
                    {isDeveloperOwner
                      ? "Logged in as Lead Developer (deniedae@gmail.com)"
                      : ticket?.status === "awaiting_human"
                      ? "Developer Standby (Ticket Active)"
                      : "AI Assistant Online"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isDeveloperOwner && (
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
                )}

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

            {/* ── Developer Owner Mode Tab Bar ──────────────────────────────── */}
            {isDeveloperOwner && (
              <div className="flex border-b border-zinc-800 bg-zinc-900/70 p-1 gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "chat"
                      ? "bg-zinc-800 text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>AI Copilot</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("developer_inbox")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "developer_inbox"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Inbox className="w-3.5 h-3.5 text-amber-400" />
                  <span>Developer Inbox</span>
                  {unansweredCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold">
                      {unansweredCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* ── VIEW 1: DEVELOPER INBOX CONSOLE (deniedae@gmail.com) ────────── */}
            {isDeveloperOwner && activeTab === "developer_inbox" ? (
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
                {/* Control bar */}
                <div className="p-3 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setFilterStatus("all")}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${
                        filterStatus === "all" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      All ({developerTickets.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus("awaiting")}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${
                        filterStatus === "awaiting" ? "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Needs Reply ({unansweredCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus("resolved")}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${
                        filterStatus === "resolved" ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30" : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Resolved
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={fetchDeveloperTickets}
                    disabled={loadingTickets}
                    className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
                    title="Refresh Tickets"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {/* Ticket list */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {loadingTickets && developerTickets.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs flex flex-col items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Loading incoming user tickets...</span>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs space-y-1">
                      <p className="font-semibold text-zinc-400">No support tickets match this filter.</p>
                      <p className="text-[11px]">User escalations will appear here in real time.</p>
                    </div>
                  ) : (
                    filteredTickets.map((t) => (
                      <div
                        key={t.ticketId}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-3 transition hover:border-zinc-700"
                      >
                        {/* Header: User & Ticket ID */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-xs">{t.userName}</span>
                              <span className="text-[10px] font-mono text-zinc-500">#{t.ticketId}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-mono">
                              <a
                                href={`mailto:${t.userEmail}?subject=Re: Spadas Tech Support [${t.ticketId}]&body=Hi ${t.userName},%0D%0A%0D%0ARegarding your support ticket (#${t.ticketId}):%0D%0A`}
                                className="text-cyan-400 hover:underline flex items-center gap-1"
                                title="Click to email user directly"
                              >
                                <Mail className="w-3 h-3" />
                                <span>{t.userEmail}</span>
                              </a>
                              {t.userPhone && <span>• 📞 {t.userPhone}</span>}
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shrink-0 ${
                              t.status === "awaiting_human" || t.status === "open"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : t.status === "answered"
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {t.status === "awaiting_human" ? "Needs Reply" : t.status}
                          </span>
                        </div>

                        {/* Issue Description */}
                        <div className="bg-zinc-950/80 rounded-lg p-2.5 border border-zinc-850 text-xs text-zinc-200">
                          <p className="font-mono text-[10px] uppercase text-zinc-500 mb-1">Issue Reported:</p>
                          <p className="leading-relaxed whitespace-pre-wrap">{t.issueDescription}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1.5">
                            Logged: {new Date(t.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {/* Collapsible Chat Context */}
                        {t.recentChatSnippet && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedChatTicketId(
                                  expandedChatTicketId === t.ticketId ? null : t.ticketId
                                )
                              }
                              className="text-[10px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  expandedChatTicketId === t.ticketId ? "rotate-180" : ""
                                }`}
                              />
                              <span>
                                {expandedChatTicketId === t.ticketId
                                  ? "Hide prior AI conversation snippet"
                                  : "View prior AI conversation snippet"}
                              </span>
                            </button>

                            {expandedChatTicketId === t.ticketId && (
                              <pre className="mt-1.5 p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                                {t.recentChatSnippet}
                              </pre>
                            )}
                          </div>
                        )}

                        {/* Existing Developer Response */}
                        {t.developerReply && (
                          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                              <span className="font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Your Recorded Reply ({t.repliedBy || "deniedae@gmail.com"}):</span>
                              </span>
                              {t.repliedAt && (
                                <span>{new Date(t.repliedAt).toLocaleTimeString()}</span>
                              )}
                            </div>
                            <p className="text-zinc-200 whitespace-pre-wrap">{t.developerReply}</p>
                          </div>
                        )}

                        {/* Reply Composer Form */}
                        <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                          <label className="block text-[10px] font-mono uppercase text-zinc-400">
                            Reply to {t.userName} (Delivered in-app):
                          </label>
                          <textarea
                            rows={2}
                            value={replyDrafts[t.ticketId] ?? ""}
                            onChange={(e) =>
                              setReplyDrafts({
                                ...replyDrafts,
                                [t.ticketId]: e.target.value,
                              })
                            }
                            placeholder="Type your response to the user here..."
                            className="w-full rounded-lg bg-zinc-950 border border-zinc-800 p-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                          />

                          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                            <a
                              href={`mailto:${t.userEmail}?subject=Re: Spadas Support [${t.ticketId}]&body=Hi ${t.userName},%0D%0A%0D%0A`}
                              className="text-[11px] font-mono text-zinc-400 hover:text-cyan-400 flex items-center gap-1 cursor-pointer"
                              title="Open Gmail to email directly"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Email via Gmail</span>
                            </a>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={submittingReplyId === t.ticketId}
                                onClick={() => handleSendDeveloperReply(t.ticketId, true)}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition cursor-pointer disabled:opacity-50"
                              >
                                <span>Resolve</span>
                              </button>

                              <button
                                type="button"
                                disabled={submittingReplyId === t.ticketId}
                                onClick={() => handleSendDeveloperReply(t.ticketId, false)}
                                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs font-mono transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {submittingReplyId === t.ticketId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                <span>Send Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* ── VIEW 2: STANDARD USER CHAT & AI COPILOT ────────────────── */
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-950">
                {/* Persistent Ticket Status Banner (When Awaiting Human) */}
                {ticket?.status === "awaiting_human" && (
                  <div className="p-2.5 px-4 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border-b border-amber-500/30 flex items-center justify-between gap-2 shrink-0 animate-fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      <span className="text-[11px] text-amber-300 font-medium truncate">
                        Ticket #{ticket.ticketId}: Spadas engineers notified.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      Standby &lt; 2h
                    </span>
                  </div>
                )}

                {/* Messages Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      } animate-fade-in`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.role === "user"
                            ? "bg-cyan-500 text-zinc-950 font-medium rounded-br-xs shadow-md"
                            : msg.role === "system"
                            ? "bg-zinc-900 border border-zinc-800 text-zinc-300 w-full"
                            : msg.id.startsWith("dev-reply-")
                            ? "bg-emerald-950/40 border border-emerald-500/40 text-emerald-100 rounded-bl-xs shadow-lg shadow-emerald-500/10"
                            : "bg-zinc-900 text-zinc-200 border border-zinc-800/80 rounded-bl-xs shadow-xs"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      <span className="text-[9px] font-mono text-zinc-600 px-1 mt-0.5">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}

                  {isStreaming && (
                    <div className="flex items-center gap-2 text-zinc-500 text-xs px-2 py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span className="font-mono text-[11px]">AI Copilot typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Diagnostics Chips */}
                <div className="px-3 py-2 border-t border-zinc-850 bg-zinc-950/90 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
                  {DEFAULT_SUPPORT_PROMPT_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(chip.prompt)}
                      disabled={isStreaming}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition whitespace-nowrap active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
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
            )}
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
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTicket}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
