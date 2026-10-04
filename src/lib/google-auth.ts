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

  const runInit = () => {
    if (!window.google?.accounts?.id || !isMounted) return false;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential?: string }) => {
          if (!response.credential) {
            onError?.(new Error("No credential returned from Google."));
            return;
          }

          try {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: "google",
              token: response.credential,
            });

            if (error) {
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

  if (!runInit()) {
    const interval = setInterval(() => {
      if (runInit()) {
        clearInterval(interval);
      }
    }, 200);
    const timeout = setTimeout(() => clearInterval(interval), 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }

  return () => {
    isMounted = false;
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
