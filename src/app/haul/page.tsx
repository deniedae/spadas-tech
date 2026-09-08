"use client";

import { SpadasHaulSection } from "@/components/spadas-haul-section";
import { useRouter } from "next/navigation";

export default function HaulPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 space-y-6 animate-fade-in pb-24 md:pb-16">
      <SpadasHaulSection onSwitchToLens={() => router.push("/lens")} />
    </div>
  );
}
