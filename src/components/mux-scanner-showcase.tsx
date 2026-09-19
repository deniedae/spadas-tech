"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Sliders,
  Maximize2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";

// Dynamic import with ssr: false ensures Web Components in Mux Player hydrate cleanly
const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video bg-zinc-950 rounded-2xl flex flex-col items-center justify-center border border-white/10 text-zinc-500">
      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mb-2" />
      <span className="text-sm font-medium">Loading high-definition video player...</span>
    </div>
  ),
});

interface Chapter {
  time: number;
  title: string;
}

interface ShowcaseClip {
  id: string;
  title: string;
  badge: string;
  duration: string;
  playbackId: string;
  description: string;
  chapters: Chapter[];
}

interface ShowcaseState {
  playbackId: string | null;
  title: string;
  description: string;
  chapters: Chapter[];
  configured: boolean;
}

const DEFAULT_SHOWCASE_PLAYBACK_ID = "nN8jeCu7U3Ko01TD3OyhfVWuCj3q00WEUvrngondd7blk";

const SHOWCASE_CLIPS: ShowcaseClip[] = [
  {
    id: "clip-1",
    title: "1. 300ms Optical Scan",
    badge: "Core Feature",
    duration: "0:12",
    playbackId: DEFAULT_SHOWCASE_PLAYBACK_ID,
    description: "Watch how Spadas Lens identifies items in under 300ms, calculates take-home net profit, and generates 80-char SEO listings in seconds.",
    chapters: [
      { time: 0, title: "Sub-300ms Optical Capture" },
      { time: 4, title: "Real-Time Australian Sold Comps" },
      { time: 8, title: "Take-Home Net Profit & Margin Engine" },
      { time: 11, title: "Instant 1-Tap SEO Listings" },
    ],
  },
  {
    id: "clip-2",
    title: "2. Aisle Sourcing & Rapid Haul",
    badge: "Op-Shop Mode",
    duration: "0:12",
    playbackId: DEFAULT_SHOWCASE_PLAYBACK_ID,
    description: "Walk thrift racks in Rapid Sourcing Mode. Every item you scan automatically aggregates into your haul ledger with live sell-through rates and CSV export.",
    chapters: [
      { time: 0, title: "Aisle Walkthrough" },
      { time: 4, title: "Continuous Scan" },
      { time: 8, title: "Ledger Sync" },
    ],
  },
  {
    id: "clip-3",
    title: "3. 1-Tap eBay Drafts",
    badge: "Seller Hub",
    duration: "0:12",
    playbackId: DEFAULT_SHOWCASE_PLAYBACK_ID,
    description: "Push complete listings straight to your eBay account drafts with pre-filled item specifics, condition grades, and optimized 80-character SEO titles.",
    chapters: [
      { time: 0, title: "Instant Appraisal" },
      { time: 5, title: "Item Specifics" },
      { time: 9, title: "1-Tap Publish" },
    ],
  },
];

export default function MuxScannerShowcase({ isAdmin = false }: { isAdmin?: boolean }) {
  const [canUpload, setCanUpload] = useState(isAdmin);
  const [selectedClipId, setSelectedClipId] = useState<string>("clip-1");
  const [showcase, setShowcase] = useState<ShowcaseState>({
    playbackId: process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID || DEFAULT_SHOWCASE_PLAYBACK_ID,
    title: SHOWCASE_CLIPS[0].title,
    description: SHOWCASE_CLIPS[0].description,
    chapters: SHOWCASE_CLIPS[0].chapters,
    configured: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [manualPlaybackId, setManualPlaybackId] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (isAdmin) {
      setCanUpload(true);
      return;
    }
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("admin") === "1" || params.get("admin") === "true") {
        setCanUpload(true);
      }
    }
  }, [isAdmin]);

  // Fetch current showcase configuration
  const loadShowcase = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/mux/showcase");
      if (res.ok) {
        const data = await res.json();
        setShowcase({
          playbackId: data.playbackId || null,
          title: data.title || "Spadas Lens — AR Reseller Scanner in Action",
          description: data.description || "",
          chapters: data.chapters || [],
          configured: Boolean(data.configured),
        });
        if (data.playbackId) {
          setManualPlaybackId(data.playbackId);
        }
      }
    } catch (err) {
      console.error("Failed to load showcase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShowcase();
  }, []);

  // Handle direct client-side upload to Mux
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a valid video file (.mp4, .mov, .webm)");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(5);
      setUploadStatusText("Requesting secure Mux upload URL...");

      // Step 1: Request direct upload URL from backend
      const initRes = await fetch("/api/mux/upload", { method: "POST" });
      const initData = await initRes.json();

      if (!initData.success || !initData.uploadUrl) {
        throw new Error(initData.error || "Failed to initialize Mux upload");
      }

      const { uploadUrl, uploadId } = initData;

      // Step 2: Upload file directly to Mux via PUT
      setUploadStatusText("Uploading video to Mux...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 85) + 5;
            setUploadProgress(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      // Step 3: Poll for Mux asset readiness
      setUploadProgress(92);
      setUploadStatusText("Processing & optimizing video with Mux AI...");

      let readyPlaybackId: string | null = null;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts && !readyPlaybackId) {
        attempts++;
        await new Promise((r) => setTimeout(r, 2500));

        const statusRes = await fetch(`/api/mux/upload?uploadId=${encodeURIComponent(uploadId)}`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.playbackId) {
            readyPlaybackId = statusData.playbackId;
            break;
          }
        }
      }

      if (!readyPlaybackId) {
        throw new Error("Video uploaded but processing is taking longer than expected. Please check back in a moment.");
      }

      // Step 4: Save playback ID as the showcase
      setUploadProgress(100);
      setUploadStatusText("Setting as live scanner showcase...");

      const saveRes = await fetch("/api/mux/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbackId: readyPlaybackId }),
      });

      if (saveRes.ok) {
        toast.success("Showcase video uploaded and published to Mux!");
        setShowcase((prev) => ({ ...prev, playbackId: readyPlaybackId }));
        setManualPlaybackId(readyPlaybackId);
        setIsUploadModalOpen(false);
      } else {
        throw new Error("Failed to save showcase reference");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  const handleManualSave = async () => {
    if (!manualPlaybackId.trim()) {
      toast.error("Please enter a valid Mux Playback ID");
      return;
    }

    try {
      const res = await fetch("/api/mux/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbackId: manualPlaybackId.trim() }),
      });

      if (res.ok) {
        toast.success("Mux playback ID saved successfully!");
        setShowcase((prev) => ({ ...prev, playbackId: manualPlaybackId.trim() }));
        setIsUploadModalOpen(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save playback ID");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error");
    }
  };

  const seekToChapter = (seconds: number) => {
    try {
      if (playerRef.current) {
        playerRef.current.currentTime = seconds;
        playerRef.current.play();
      }
    } catch (err) {
      console.warn("Seek error:", err);
    }
  };

  const handleSelectClip = (clip: ShowcaseClip) => {
    setSelectedClipId(clip.id);
    setShowcase((prev) => ({
      ...prev,
      playbackId: clip.playbackId,
      title: clip.title,
      description: clip.description,
      chapters: clip.chapters,
    }));
    try {
      if (playerRef.current) {
        playerRef.current.currentTime = 0;
      }
    } catch {}
  };

  return (
    <section id="demo-video" className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mb-3">
            <Video className="w-3.5 h-3.5" />
            <span>Interactive Video Walkthrough</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            See the Scanner in Action
          </h2>
          <p className="text-sm text-zinc-400 mt-2 max-w-xl">
            {showcase.description}
          </p>
        </div>

        {/* Action Controls - only visible if admin */}
        {canUpload && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload Demo Video</span>
            </button>
          </div>
        )}
      </div>

      {/* Multi-Video Reel Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        {SHOWCASE_CLIPS.map((clip) => {
          const isSelected = selectedClipId === clip.id;
          return (
            <button
              key={clip.id}
              onClick={() => handleSelectClip(clip)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 border ${
                isSelected
                  ? "bg-white text-zinc-950 border-white shadow-lg font-black"
                  : "bg-[#0A0D14] hover:bg-zinc-900 text-zinc-300 border-white/[0.08]"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isSelected ? "bg-cyan-500 animate-pulse" : "bg-zinc-600"
                }`}
              />
              <span>{clip.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected
                    ? "bg-zinc-200 text-zinc-900"
                    : "bg-white/[0.05] text-zinc-400"
                }`}
              >
                {clip.duration}
              </span>
            </button>
          );
        })}
      </div>

      {/* Video Container */}
      <div className="relative rounded-3xl overflow-hidden border border-white/[0.12] bg-[#0A0D14] shadow-2xl p-2 sm:p-3">
        {showcase.playbackId ? (
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-black flex items-center justify-center">
            <MuxPlayer
              ref={playerRef}
              playbackId={showcase.playbackId}
              envKey={process.env.NEXT_PUBLIC_MUX_ENV_KEY || "0qojc2e1e88k09u028i9fk4r4"}
              metadata={{
                video_title: showcase.title,
                player_name: "Spadas Lens Player",
              }}
              streamType="on-demand"
              accentColor="#22d3ee"
              className="w-full h-full object-contain"
              primaryColor="#ffffff"
              secondaryColor="#0a0d14"
            />
          </div>
        ) : canUpload ? (
          /* Admin First-Time State */
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-b from-zinc-900 to-[#0A0D14] flex flex-col items-center justify-center p-6 text-center border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Ready to Upload Scanner Demo
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
              Upload a screen recording of your camera HUD in action to showcase sub-300ms identification and real-time eBay comps.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-md"
              >
                <Upload className="w-4 h-4 text-cyan-600" />
                <span>Upload Scanner Recording</span>
              </button>
            </div>
          </div>
        ) : (
          /* Public Visitor Preview State */
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-b from-zinc-900 to-[#0A0D14] flex flex-col items-center justify-center p-6 text-center border border-white/5">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-lg shadow-cyan-500/10">
              <Play className="w-7 h-7 fill-current translate-x-0.5" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Spadas Lens AR Scanner
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
              Sub-300ms visual identification, real-time Australian sold comps, and automated 80-char SEO listings for high-volume resellers.
            </p>
            <a
              href="/lens"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs transition active:scale-95 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <span>Launch AR Scanner Camera</span>
            </a>
          </div>
        )}

        {/* Feature Chapters Strip */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider pl-1 hidden sm:inline">
              Chapters:
            </span>
            {showcase.chapters.map((chapter, idx) => (
              <button
                key={idx}
                onClick={() => seekToChapter(chapter.time)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-xs text-zinc-300 hover:text-white transition whitespace-nowrap active:scale-95"
              >
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>{chapter.title}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-400 font-mono pr-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>4K Ultra-HD Demo</span>
          </div>
        </div>
      </div>

      {/* Upload / Config Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-white/10 p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Scanner Demo Video</h3>
                  <p className="text-xs text-zinc-400">Direct high-speed video upload</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                uploading
                  ? "border-cyan-500/50 bg-cyan-500/5"
                  : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-900"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />

              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-white mb-1">
                {uploading ? "Uploading & Processing..." : "Choose Scanner Video File"}
              </div>
              <p className="text-xs text-zinc-500">
                MP4, MOV, or WebM screen recordings (up to 4K resolution)
              </p>

              {uploading && (
                <div className="mt-4 space-y-2">
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="text-xs text-cyan-300 font-medium">{uploadStatusText}</div>
                </div>
              )}
            </div>

            {/* Manual Playback ID Option */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span>Or Paste Existing Video Stream ID:</span>
                <span className="text-[10px] text-zinc-500 font-mono">Stream Playback ID</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste stream ID (e.g. 01d672...)"
                  value={manualPlaybackId}
                  onChange={(e) => setManualPlaybackId(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-zinc-600 outline-none"
                />
                <button
                  onClick={handleManualSave}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition active:scale-95"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
