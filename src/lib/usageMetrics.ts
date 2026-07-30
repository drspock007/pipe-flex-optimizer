/**
 * Usage measurement (GA4 via the Lovable connector).
 * Neutral module name on purpose: modules named "analytics"/"tracking" are
 * filtered by common browser extensions inside the preview iframe.
 * Nothing is loaded before the visitor allows measurement.
 */

import { hasMeasurementConsent } from "@/lib/privacyChoices";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const rawMeasurementId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as
  | string
  | undefined;

// A GA4 measurement ID always looks like "G-XXXXXXXXXX".
const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const measurementId =
  rawMeasurementId && MEASUREMENT_ID_PATTERN.test(rawMeasurementId.trim())
    ? rawMeasurementId.trim()
    : undefined;

let enabled = false;

/** Load the measurement script. Called only after an explicit visitor choice. */
export function enableUsageMetrics(): void {
  if (enabled) return;
  if (!measurementId) {
    console.warn(
      "[usageMetrics] invalid-measurement-id — measurement disabled, received:",
      rawMeasurementId ?? "(none)",
    );
    return;
  }
  enabled = true;

  try {
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
  } catch {
    // Ignore: script injection blocked (extension, CSP) must never break the app.
  }
}

/** Enable measurement on startup only when consent was already given. */
export function initUsageMetrics(): void {
  try {
    if (hasMeasurementConsent()) enableUsageMetrics();
  } catch {
    // Ignore: storage unavailable.
  }
}

export function recordView(path: string): void {
  if (!enabled) return;
  try {
    window.gtag?.("event", "page_view", { page_path: path });
  } catch {
    // Ignore.
  }
}

export function recordEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!enabled) return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    // Ignore.
  }
}
