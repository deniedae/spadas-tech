"use client";

import { Suspense } from "react";
import { SpadasAuthCard } from "@/components/spadas-auth-card";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E] flex items-center justify-center text-zinc-500 font-mono text-xs">Loading Spadas Lens...</div>}>
      <SpadasAuthCard initialMode="signup" />
    </Suspense>
  );
}
