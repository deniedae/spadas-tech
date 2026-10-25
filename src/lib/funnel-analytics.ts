import { track } from "@vercel/analytics";

/**
 * Funnel events for the first-launch -> subscribe path. Sent to Vercel Analytics, the same
 * channel already used for `lens_comp_*` events. Names are stable so the funnel can be read
 * in order:
 *
 *   onboarding_completed | onboarding_skipped
 *     -> signin_required (signed-out user sent to /login)
 *     -> signup_success | login_success
 *     -> paywall_viewed
 *     -> trial_cta_tapped
 *     -> purchase_success | paywall_dismissed
 *
 * Never pass emails, user ids or other personal data in props.
 */
export type FunnelEvent =
  | "onboarding_completed"
  | "onboarding_skipped"
  | "signin_required"
  | "signup_success"
  | "login_success"
  | "paywall_viewed"
  | "trial_cta_tapped"
  | "purchase_success"
  | "paywall_dismissed";

export function trackFunnel(
  event: FunnelEvent,
  props?: Record<string, string | number | boolean | null>
): void {
  if (typeof window === "undefined") return;
  try {
    track(event, props);
  } catch {
    // Analytics must never break the app.
  }
}
