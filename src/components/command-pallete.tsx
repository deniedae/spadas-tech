"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, LayoutDashboard, Package, BarChart3, Settings, Plus, Sparkles, Home } from "lucide-react";
interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  group: "Navigation" | "Actions";
}
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands: Command[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Navigation", action: () => router.push("/dashboard") },
    { id: "listings", label: "Listings", icon: Package, group: "Navigation", action: () => router.push("/listings") },
    { id: "analytics", label: "Analytics", icon: BarChart3, group: "Navigation", action: () => router.push("/analytics") },
    { id: "settings", label: "Settings", icon: Settings, group: "Navigation", action: () => router.push("/settings") },
    { id: "home", label: "Home", icon: Home, group: "Navigation", action: () => router.push("/") },
    { id: "new-listing", label: "New Listing", hint: "Manual", icon: Plus, group: "Actions", action: () => router.push("/listings?new=true") },
    { id: "ai-listing", label: "Generate AI Listing", icon: Sparkles, group: "Actions", action: () => router.push("/listings/ai-new") },
    {
  id: "sourcing",
  label: "Sourcing Assistant",
  icon: Target,
  group: "Actions",
  action: () => router.push("/sourcing"),
},

  ];
  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );
  const run = useCallback((cmd?: Command) => {
    const target = cmd ?? filtered[activeIdx];
    if (!target) return;
    setOpen(false);
    setQuery("");
    setActiveIdx(0);
    target.action();
  }, [filtered, activeIdx]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setActiveIdx(0);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, run]);
  if (!open) return null;
  return (
    
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(0);
            }}
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No commands found</p>
          )}
          {(["Navigation", "Actions"] as const).map((group) => {
            const items = filtered.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
                
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                {items.map((cmd) => {
                  const idx = filtered.indexOf(cmd);
                  const active = idx === activeIdx;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.id}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => run(cmd)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.hint && (
                        <span className={`text-xs ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{cmd.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>↑↓ to navigate · ↵ to select</span>
          <span>Spadas AI</span>
        </div>
      </div>
    </div>
  );
}
