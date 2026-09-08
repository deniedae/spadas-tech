"use client";

import UnifiedCameraHub from "@/components/unified-camera-hub";

export default function HaulPage() {
  return (
    <div className="w-full max-w-full overflow-x-hidden box-border space-y-6 animate-fade-in pb-16">
      <UnifiedCameraHub initialTab="haul" />
    </div>
  );
}
