"use client";

import UnifiedCameraHub from "@/components/unified-camera-hub";

export default function IronmanPage() {
  return (
    <div className="w-full min-h-full flex-1 flex flex-col overflow-y-auto md:overflow-visible box-border animate-fade-in">
      <UnifiedCameraHub initialTab="cyber" />
    </div>
  );
}
