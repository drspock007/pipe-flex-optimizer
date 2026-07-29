/**
 * Google Analytics 4 integration via the Lovable Google Analytics connector.
 * Reads the public Measurement ID from VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY.
 */

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (!measurementId) {
    console.warn("[analytics] VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY is not configured");
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
}

export function trackPageView(path: string): void {
  if (!measurementId || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path });
}

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!measurementId || !window.gtag) return;
  window.gtag("event", name, params);
}
