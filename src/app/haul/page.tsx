"use client";

import { SpadasHaulSection } from "@/components/spadas-haul-section";
import { useRouter } from "next/navigation";

export default function HaulPage() {
  const router = useRouter();

  return (
    <div
      className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 space-y-6 animate-fade-in pb-28 md:pb-24 overflow-y-auto"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)" }}
    >
      <SpadasHaulSection onSwitchToLens={() => router.push("/lens")} />
    </div>
  );
}
