"use client";

import UnifiedCameraHub from "@/components/unified-camera-hub";

export default function IronmanPage() {
  return (
    <div className="w-full min-h-screen bg-black">
      <UnifiedCameraHub initialTab="ironman" />
    </div>
  );
}
