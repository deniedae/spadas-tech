"use client";

import { supabase } from "@/app/lib/supabase";

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "395950472132-e94vpntj2mjnavse0seg5gfhu3r7vk7b.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          prompt: (notification?: (notification: any) => void) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          cancel: () => void;
        };
      };
    };
  }
}

async function generateNonce(): Promise<{ rawNonce: string; hashedNonce: string }> {
  try {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
      const rawBytes = new Uint8Array(32);
      window.crypto.getRandomValues(rawBytes);
      const rawNonce = Array.from(rawBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const encoder = new TextEncoder();
      const encoded = encoder.encode(rawNonce);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      return { rawNonce, hashedNonce };
    }
  } catch (err) {
    console.warn("[Google Identity] Nonce crypto error:", err);
  }
  const fallback = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return { rawNonce: fallback, hashedNonce: fallback };
}

/**
 * Initializes Google Identity Services (One-Tap & ID Token sign-in).
 * This signs in directly to Supabase via `signInWithIdToken`, completely
 * bypassing the ugly `supabase.co` browser redirect and keeping the user
 * on your branded domain (e.g. spadas-tech.vercel.app).
 */
export function initGoogleIdentityServices({
  onSuccess,
  onError,
  autoPrompt = false,
}: {
  onSuccess?: (user: any) => void;
  onError?: (err: any) => void;
  autoPrompt?: boolean;
} = {}): (() => void) | void {
  if (typeof window === "undefined") return;

  let isMounted = true;
  let activeRawNonce: string | null = null;

  const runInit = async () => {
    if (!window.google?.accounts?.id || !isMounted) return false;

    try {
      const { rawNonce, hashedNonce } = await generateNonce();
      activeRawNonce = rawNonce;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            onError?.(new Error("No credential returned from Google."));
            return;
          }

          try {
            // Step 1: Attempt sign in passing the rawNonce that matches Google's hashedNonce
            let { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
              nonce: activeRawNonce || undefined,
            });

            // Resilient Fallback 1: If Supabase has "Skip nonce checks" enabled or rejects nonce parameter
            if (error && error.message?.toLowerCase().includes("nonce")) {
              console.warn("[Google Identity] Nonce mismatch detected, retrying without nonce...", error.message);
              const retryWithoutNonce = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
              });
              data = retryWithoutNonce.data;
              error = retryWithoutNonce.error;
            }

            // Resilient Fallback 2: If still nonce error, try hashedNonce
            if (error && error.message?.toLowerCase().includes("nonce")) {
              console.warn("[Google Identity] Retrying with hashedNonce...", error.message);
              const retryHashed = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce: hashedNonce,
              });
              data = retryHashed.data;
              error = retryHashed.error;
            }

            if (error) {
              console.error("[Google Identity] Supabase signInWithIdToken error:", error);
              onError?.(error);
            } else {
              onSuccess?.(data.user);
            }
          } catch (err) {
            onError?.(err);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (autoPrompt) {
        window.google.accounts.id.prompt();
      }
      return true;
    } catch (err) {
      console.warn("[Google Identity] Init warning:", err);
      return false;
    }
  };

  let interval: NodeJS.Timeout | null = null;
  let timeout: NodeJS.Timeout | null = null;

  void runInit().then((initialized) => {
    if (!initialized && isMounted) {
      interval = setInterval(() => {
        void runInit().then((success) => {
          if (success && interval) {
            clearInterval(interval);
            interval = null;
          }
        });
      }, 200);
      timeout = setTimeout(() => {
        if (interval) clearInterval(interval);
      }, 5000);
    }
  });

  return () => {
    isMounted = false;
    if (interval) clearInterval(interval);
    if (timeout) clearTimeout(timeout);
  };
}

/**
 * Programmatically triggers the Google One-Tap prompt or renders the native button.
 */
export function promptGoogleOneTap(): boolean {
  if (typeof window !== "undefined" && window.google?.accounts?.id) {
    try {
      window.google.accounts.id.prompt();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
