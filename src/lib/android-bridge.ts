/**
 * Spadas Android Native Bridge & Widget Synchronizer
 * Enables bidirectional communication between the Spadas web/PWA interface
 * and the native Android Kotlin companion suite (Widgets, Quick Settings, Haptics).
 */

declare global {
  interface Window {
    AndroidBridge?: {
      updateWidgetStats?: (profitText: string, inventoryCount: number) => void;
      triggerNativeHaptic?: (type: string) => void;
      launchNativeCameraScanner?: () => void;
      toggleTorch?: (enabled: boolean) => void;
      openExternalUrl?: (url: string) => void;
    };
  }
}

/**
 * Broadcasts updated profit and inventory statistics to the Android Home Screen Widget.
 * Works seamlessly whether running inside the native Android wrapper, TWA, or standalone browser.
 */
export function syncProfitToAndroidWidget(totalProfit: number, itemCount = 0): void {
  if (typeof window === "undefined") return;

  const formattedProfit = totalProfit.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });

  // 1. Direct Native Android Bridge Interface (if running in custom WebView container)
  if (window.AndroidBridge && typeof window.AndroidBridge.updateWidgetStats === "function") {
    try {
      window.AndroidBridge.updateWidgetStats(formattedProfit, itemCount);
    } catch (e) {
      console.warn("[AndroidBridge] Native widget update failed:", e);
    }
  }

  // 2. Local Storage Cache (Picked up by Service Worker and PWA sync)
  try {
    localStorage.setItem("spadas_widget_profit", formattedProfit);
    localStorage.setItem("spadas_widget_items", String(itemCount));
    localStorage.setItem("spadas_widget_last_sync", String(Date.now()));
  } catch {}

  // 3. BroadcastChannel for cross-tab / background worker synchronization
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel("spadas_stats_sync");
      channel.postMessage({
        type: "STATS_UPDATE",
        profit: formattedProfit,
        itemCount,
        timestamp: Date.now(),
      });
      channel.close();
    }
  } catch {}
}

export type HapticType =
  | "tap"
  | "click"
  | "selection"
  | "shutter"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "grail"
  | "error";

/**
 * Trigger tactile native haptic feedback patterns.
 * Supports native Android WebView bridge wrapper as well as navigator.vibrate.
 */
export function triggerTactileHaptic(
  type: HapticType = "tap"
): void {
  if (typeof window === "undefined") return;

  if (window.AndroidBridge && typeof window.AndroidBridge.triggerNativeHaptic === "function") {
    try {
      window.AndroidBridge.triggerNativeHaptic(type);
      return;
    } catch {}
  }

  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      switch (type) {
        case "tap":
        case "click":
          navigator.vibrate(10);
          break;
        case "selection":
          navigator.vibrate(12);
          break;
        case "shutter":
          navigator.vibrate(15);
          break;
        case "light":
          navigator.vibrate(15);
          break;
        case "medium":
          navigator.vibrate(35);
          break;
        case "heavy":
          navigator.vibrate(60);
          break;
        case "success":
          navigator.vibrate([30, 20, 30]);
          break;
        case "warning":
          navigator.vibrate([40, 30, 40, 30, 50]);
          break;
        case "grail":
          navigator.vibrate([40, 30, 40, 30, 100]);
          break;
        case "error":
          navigator.vibrate([70, 40, 70, 40, 110]);
          break;
        default:
          navigator.vibrate(10);
      }
    } catch {}
  }
}

/** Convenience shortcut for quick button presses and tab switches (10ms pulse) */
export const triggerTapHaptic = () => triggerTactileHaptic("tap");
/** Convenience shortcut for camera snapshot shutter (15ms pulse) */
export const triggerShutterHaptic = () => triggerTactileHaptic("shutter");
/** Convenience shortcut for tab/filter selections (12ms pulse) */
export const triggerSelectionHaptic = () => triggerTactileHaptic("selection");

/**
 * Check if the user is running on an Android device or Android TWA wrapper.
 */
export function isAndroidPlatform(): boolean {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}

/**
 * Detects if the app is installed and running in standalone display mode
 * (Android APK / TWA container or PWA Home Screen standalone).
 */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    Boolean(window.AndroidBridge)
  );
}

/**
 * Detects specifically if the user is in the compiled Android APK container.
 */
export function isApkWrapper(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.AndroidBridge) || (isAndroidPlatform() && isStandaloneApp());
}

/**
 * Safely opens an external comp / marketplace URL across all environments:
 * Web, Android TWA, Android WebView container, iOS standalone PWA.
 * 
 * Guards against:
 * 1. Missing or unhandled `target="_blank"` crashes in Android WebViews / TWAs
 * 2. Unsafe cleartext http:// URLs (automatically upgraded to https://)
 * 3. Null/undefined/malformed URLs (falls back to safe eBay AU completed/sold search)
 * 4. Missing rel="noopener noreferrer" which causes opener hijacking/crashes
 * 5. Event bubbling that causes accidental card selection or exclusions
 */
export function openExternalUrlSafely(
  rawUrl?: string | null,
  fallbackQuery?: string,
  event?: React.MouseEvent | React.TouchEvent | Event
): void {
  if (event) {
    try {
      event.preventDefault();
      event.stopPropagation();
    } catch {}
  }

  if (typeof window === "undefined") return;

  try {
    // 1. Sanitize raw URL
    let url = (rawUrl || "").trim();

    // If empty or literal strings 'null' / 'undefined' or relative, fall back to safe search
    if (
      !url ||
      url === "undefined" ||
      url === "null" ||
      (!url.startsWith("http://") && !url.startsWith("https://"))
    ) {
      const q = encodeURIComponent(
        (fallbackQuery || "").replace(/[^\w\s-]/g, "").trim() || "vintage item"
      );
      url = `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
    }

    // Upgrade cleartext http to https (required by Android Network Security Config)
    if (url.startsWith("http://")) {
      url = url.replace(/^http:\/\//i, "https://");
    }

    // Validate URL object
    try {
      new URL(url);
    } catch {
      const q = encodeURIComponent(
        (fallbackQuery || "").replace(/[^\w\s-]/g, "").trim() || "vintage item"
      );
      url = `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1`;
    }

    // 2. Check if running inside Android WebView bridge with custom external opener
    if (
      window.AndroidBridge &&
      typeof window.AndroidBridge.openExternalUrl === "function"
    ) {
      try {
        window.AndroidBridge.openExternalUrl(url);
        return;
      } catch (e) {
        console.warn("[AndroidBridge] Native openExternalUrl failed, falling back to window.open:", e);
      }
    }

    // 3. Robust browser window opener with noopener, noreferrer
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (!win || win.closed || typeof win.closed === "undefined") {
      // Pop-up blocker or restrictive WebView container fallback
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error("[openExternalUrlSafely] Failed to open URL:", err);
  }
}

