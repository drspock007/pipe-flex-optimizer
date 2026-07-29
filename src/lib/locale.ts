/**
 * Central locale helper.
 * Single source of truth for the app language, ready for a future i18n setup:
 * swap the body of `getLocale()` (or plug an i18n context) without touching components.
 */

export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

function isSupported(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Detect the active locale: URL path prefix first, then browser language, then default. */
export function getLocale(): Locale {
  try {
    const segment = window.location.pathname.split("/")[1]?.toLowerCase() ?? "";
    if (isSupported(segment)) return segment;

    const browser = (navigator.language || "").slice(0, 2).toLowerCase();
    if (isSupported(browser)) return browser;
  } catch {
    // Ignore: unavailable window/navigator (SSR or restricted context).
  }
  return DEFAULT_LOCALE;
}

/** Pick the entry matching the active locale from a locale-keyed dictionary. */
export function pickLocale<T>(dictionary: Record<Locale, T>, locale: Locale): T {
  return dictionary[locale] ?? dictionary[DEFAULT_LOCALE];
}
