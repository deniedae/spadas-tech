"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    const route = typeof window !== "undefined" ? window.location.pathname : "";

    // 1. Console visibility in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[WebVital] ${metric.name} on ${route}:`, {
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        delta: metric.delta,
      });
    }

    // 2. Report to Google Tag Manager / GA4 dataLayer
    if (typeof window !== "undefined") {
      const win = window as Window & {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };

      if (typeof win.gtag === "function") {
        win.gtag("event", metric.name, {
          value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
          event_label: metric.id,
          metric_rating: metric.rating,
          metric_value: metric.value,
          metric_delta: metric.delta,
          page_route: route,
          non_interaction: true,
        });
      } else if (Array.isArray(win.dataLayer)) {
        win.dataLayer.push({
          event: "web-vitals",
          vital_name: metric.name,
          vital_value: metric.value,
          vital_rating: metric.rating,
          vital_delta: metric.delta,
          vital_id: metric.id,
          page_route: route,
        });
      }
    }
  });

  return null;
}
