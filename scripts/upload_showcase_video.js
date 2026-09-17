#!/usr/bin/env node
/**
 * Spadas Tech — Mux Showcase Video Direct Uploader
 *
 * Usage:
 *   node scripts/upload_showcase_video.js "C:\path\to\scanner-demo.mp4"
 */

const fs = require("fs");
const path = require("path");
const Mux = require("@mux/mux-node");

// Read .env.local to load credentials if not already in process.env
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvLocal();

const tokenId = process.env.MUX_TOKEN_ID;
const tokenSecret = process.env.MUX_TOKEN_SECRET;

if (!tokenId || !tokenSecret) {
  console.error("❌ Error: MUX_TOKEN_ID or MUX_TOKEN_SECRET missing in .env.local");
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("❌ Usage: node scripts/upload_showcase_video.js <path-to-video-file>");
  console.error('   Example: node scripts/upload_showcase_video.js "C:\\Users\\denie\\Videos\\scanner_demo.mp4"');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Error: File not found at "${resolvedPath}"`);
  process.exit(1);
}

const stats = fs.statSync(resolvedPath);
const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log(`\n🎬 Spadas Lens — Mux Video Uploader`);
console.log(`📁 File: ${resolvedPath} (${sizeMB} MB)`);

const mux = new Mux({ tokenId, tokenSecret });

async function upload() {
  try {
    console.log("\n[1/4] 🚀 Requesting secure direct upload URL from Mux...");
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "baseline",
      },
      cors_origin: "*",
    });

    console.log(`      Upload ID: ${upload.id}`);

    console.log("\n[2/4] 📤 Uploading video file directly to Mux...");
    const fileStream = fs.createReadStream(resolvedPath);

    const response = await fetch(upload.url, {
      method: "PUT",
      headers: {
        "Content-Length": stats.size.toString(),
        "Content-Type": "video/mp4",
      },
      body: fileStream,
      duplex: "half",
    });

    if (!response.ok) {
      throw new Error(`Upload failed with HTTP ${response.status}: ${response.statusText}`);
    }

    console.log("      Upload completed successfully!");

    console.log("\n[3/4] ⏳ Processing video and creating HLS stream (polling Mux)...");
    let assetId = null;
    let attempts = 0;

    while (!assetId && attempts < 40) {
      attempts++;
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 2000));
      const status = await mux.video.uploads.retrieve(upload.id);
      if (status.asset_id) {
        assetId = status.asset_id;
      }
    }
    console.log("");

    if (!assetId) {
      throw new Error("Timed out waiting for Mux asset creation.");
    }

    console.log(`      Asset created: ${assetId}`);
    console.log("\n[4/4] ⚡ Waiting for asset ready state...");

    let playbackId = null;
    let assetAttempts = 0;
    while (!playbackId && assetAttempts < 30) {
      assetAttempts++;
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 2000));
      const asset = await mux.video.assets.retrieve(assetId);
      if (asset.playback_ids && asset.playback_ids.length > 0) {
        playbackId = asset.playback_ids[0].id;
        break;
      }
    }
    console.log("");

    if (!playbackId) {
      throw new Error("Asset created, but no public playback ID was assigned.");
    }

    console.log(`\n🎉 Success! Playback ID: ${playbackId}`);

    // Update .mux-showcase.json
    const showcaseFile = path.join(process.cwd(), ".mux-showcase.json");
    const showcaseData = {
      playbackId,
      title: "Spadas Lens — AR Reseller Scanner in Action",
      description: "Watch how Spadas Lens identifies items in under 300ms, calculates take-home net profit, and generates 80-char SEO listings.",
      chapters: [
        { time: 0, title: "Sub-300ms AR Camera Detection" },
        { time: 12, title: "Real-Time Australian Sold Comps" },
        { time: 25, title: "Take-Home Net Profit & Margin Engine" },
        { time: 42, title: "Media Format OCR & 1-Tap SEO Listings" },
      ],
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(showcaseFile, JSON.stringify(showcaseData, null, 2), "utf-8");
    console.log("✅ Updated .mux-showcase.json");

    // Update .env.local if present
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf-8");
      if (envContent.includes("NEXT_PUBLIC_MUX_PLAYBACK_ID=")) {
        envContent = envContent.replace(
          /NEXT_PUBLIC_MUX_PLAYBACK_ID=.*/g,
          `NEXT_PUBLIC_MUX_PLAYBACK_ID=${playbackId}`
        );
      } else {
        envContent += `\nNEXT_PUBLIC_MUX_PLAYBACK_ID=${playbackId}\n`;
      }
      fs.writeFileSync(envPath, envContent, "utf-8");
      console.log("✅ Updated NEXT_PUBLIC_MUX_PLAYBACK_ID in .env.local");
    }

    console.log(`\n✨ Done! Your video is now live across the landing page and the camera HUD tutorial!`);
  } catch (err) {
    console.error(`\n❌ Upload error:`, err.message);
    process.exit(1);
  }
}

upload();
