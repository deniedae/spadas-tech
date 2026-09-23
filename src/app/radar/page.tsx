"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RadarPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/lens");
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6 text-center">
      <div className="space-y-3 font-mono">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent mx-auto" />
        <p className="text-xs text-zinc-400">Redirecting to Spadas Lens AR...</p>
      </div>
    </div>
  );
}
