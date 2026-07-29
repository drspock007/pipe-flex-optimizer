/**
 * Storage of the visitor privacy choices.
 * Hardened for cross-origin iframes where localStorage access throws a
 * SecurityError: every access is guarded and falls back to an in-memory value
 * so the app can never crash because of storage restrictions.
 */

export interface PrivacyChoices {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export const STORAGE_KEY = "privacyChoices";

export const DEFAULT_CHOICES: PrivacyChoices = {
  necessary: true,
  analytics: false,
  marketing: false,
};

/** In-memory fallback used when localStorage is unavailable or blocked. */
let memoryChoices: PrivacyChoices | null = null;

function parse(raw: string | null): PrivacyChoices | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PrivacyChoices>;
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return null;
  }
}

/** Read the stored choices, or null when the visitor has not answered yet. */
export function readChoices(): PrivacyChoices | null {
  try {
    const stored = parse(window.localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // SecurityError / QuotaExceededError / storage disabled: use memory only.
  }
  return memoryChoices;
}

/** Persist the choices; silently degrades to memory when storage is blocked. */
export function saveChoices(choices: PrivacyChoices): void {
  memoryChoices = { ...choices, necessary: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryChoices));
  } catch {
    // Ignore: choices remain valid for the current session only.
  }
}

/** True when the visitor explicitly allowed usage measurement. */
export function hasMeasurementConsent(): boolean {
  return readChoices()?.analytics === true;
}
