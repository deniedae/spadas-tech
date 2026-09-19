import { NextResponse } from "next/server";
import { isMuxConfigured } from "@/lib/mux";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

interface ShowcaseData {
  playbackId: string | null;
  title: string;
  description: string;
  chapters: Array<{ time: number; title: string }>;
  updatedAt?: string;
}

const DATA_FILE = path.join(process.cwd(), ".mux-showcase.json");

function getStoredShowcase(): ShowcaseData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // ignore read error
  }

  return {
    playbackId: process.env.NEXT_PUBLIC_MUX_PLAYBACK_ID || "nN8jeCu7U3Ko01TD3OyhfVWuCj3q00WEUvrngondd7blk",
    title: "Spadas Lens — AR Reseller Scanner in Action",
    description: "Watch how Spadas Lens identifies items in under 300ms, calculates take-home net profit, and generates 80-char SEO listings in seconds.",
    chapters: [
      { time: 0, title: "Sub-300ms Optical Capture" },
      { time: 4, title: "Real-Time Australian Sold Comps" },
      { time: 8, title: "Take-Home Net Profit & Margin Engine" },
      { time: 11, title: "Instant 1-Tap SEO Listings" },
    ],
  };
}

function saveShowcase(data: ShowcaseData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save .mux-showcase.json:", err);
  }
}

export async function GET() {
  const showcase = getStoredShowcase();
  const configured = isMuxConfigured();

  return NextResponse.json({
    success: true,
    configured,
    ...showcase,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playbackId, title, description } = body;

    if (!playbackId || typeof playbackId !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid or missing playbackId" },
        { status: 400 }
      );
    }

    const current = getStoredShowcase();
    const updated: ShowcaseData = {
      ...current,
      playbackId: playbackId.trim(),
      title: title || current.title,
      description: description || current.description,
      updatedAt: new Date().toISOString(),
    };

    saveShowcase(updated);

    return NextResponse.json({
      success: true,
      message: "Showcase video playback ID updated successfully",
      ...updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update showcase" },
      { status: 500 }
    );
  }
}
