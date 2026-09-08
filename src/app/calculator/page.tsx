"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalculatorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center text-xs font-mono text-zinc-500">
      Redirecting to Portfolio...
    </div>
  );
}
