"use client";

import { Suspense } from "react";
import { SpadasAuthCard } from "@/components/spadas-auth-card";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading Spadas AI...</div>}>
      <SpadasAuthCard initialMode="login" />
    </Suspense>
  );
}
