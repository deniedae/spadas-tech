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

/**
 * Trigger tactile native haptic feedback patterns.
 */
export function triggerTactileHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "grail" = "success"
): void {
  if (typeof window === "undefined") return;

  if (window.AndroidBridge && typeof window.AndroidBridge.triggerNativeHaptic === "function") {
    try {
      window.AndroidBridge.triggerNativeHaptic(type);
      return;
    } catch {}
  }

  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    switch (type) {
      case "light":
        navigator.vibrate(20);
        break;
      case "medium":
        navigator.vibrate(40);
        break;
      case "heavy":
        navigator.vibrate(70);
        break;
      case "success":
        navigator.vibrate([40, 25, 40]);
        break;
      case "warning":
        navigator.vibrate([60, 40, 60, 40, 60]);
        break;
      case "grail":
        navigator.vibrate([40, 30, 40, 30, 80]);
        break;
    }
  }
}

/**
 * Check if the user is running on an Android device or Android TWA wrapper.
 */
export function isAndroidPlatform(): boolean {
  if (typeof window === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}
