"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

 async function handleLogin(e: React.FormEvent) {
  e.preventDefault();

  setLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  setLoading(false);

  console.log("Login data:", data);
  console.log("Login error:", error);

  if (error) {
  toast.error(error.message);
    return;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("Current user:", user);

  if (!user) {
   toast.error("Login failed - no user session found.");
    return;
  }

  router.push("/dashboard");
}

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-6 text-3xl font-bold text-center">
          Login
        </h1>

        <div className="mb-4">
          <label className="mb-2 block font-medium">
            Email
          </label>

          <input
            type="email"
            className="w-full rounded-lg border p-3"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block font-medium">
            Password
          </label>

          <input
            type="password"
            className="w-full rounded-lg border p-3"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing In..." : "Login"}
        </button>
      </form>
    </main>
  );
}