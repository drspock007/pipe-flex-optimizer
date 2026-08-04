// src/lib/presets/crud.ts
// Local-storage CRUD for presets, with legacy migration and write verification.

import { z } from "zod";
import {
  MAX_PRESETS_PER_MODE,
  PresetEntry,
  PresetMode,
  StorageResult,
  legacyPresetEntrySchema,
  newId,
  presetEntrySchema,
  storageKey,
  storeSchema,
} from "./schema";

export const PRESETS_CHANGED_EVENT = "presets-changed";

function notifyChange() {
  try {
    window.dispatchEvent(new CustomEvent(PRESETS_CHANGED_EVENT));
  } catch {
    /* no-op */
  }
}

/** Reads presets for a mode, migrating the legacy v1 array format when found. */
export function getPresets(mode: PresetMode): PresetEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    const modern = storeSchema.safeParse(parsed);
    if (modern.success) return modern.data.presets;

    // Legacy migration: bare array of { name, values, createdAt }
    const legacy = z.array(legacyPresetEntrySchema).safeParse(parsed);
    if (legacy.success) {
      const migrated: PresetEntry[] = legacy.data.map((p) => ({
        id: newId(),
        name: p.name,
        mode,
        values: p.values,
        createdAt: p.createdAt,
        updatedAt: p.createdAt,
      }));
      writePresets(mode, migrated);
      return migrated;
    }

    // Salvage whatever individual entries are still valid
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => presetEntrySchema.safeParse(item))
        .filter((r): r is { success: true; data: PresetEntry } => r.success)
        .map((r) => r.data);
    }
    return [];
  } catch {
    return [];
  }
}

/** Writes and immediately reads back to confirm the data actually persisted. */
export function writePresets(mode: PresetMode, presets: PresetEntry[]): StorageResult {
  const payload = JSON.stringify({ schemaVersion: 2, presets });
  try {
    localStorage.setItem(storageKey(mode), payload);
  } catch (e) {
    const quota = e instanceof DOMException && e.name === "QuotaExceededError";
    return {
      ok: false,
      error: quota
        ? "Local storage is full. Delete a preset or export them to a file."
        : "Local storage is unavailable (private browsing or blocked storage).",
    };
  }
  try {
    if (localStorage.getItem(storageKey(mode)) !== payload) {
      return { ok: false, error: "Save could not be verified in local storage." };
    }
  } catch {
    return { ok: false, error: "Save could not be verified in local storage." };
  }
  notifyChange();
  return { ok: true };
}

export function findByName(mode: PresetMode, name: string): PresetEntry | undefined {
  const target = name.trim().toLowerCase();
  return getPresets(mode).find((p) => p.name.toLowerCase() === target);
}

export function createPreset(
  mode: PresetMode,
  name: string,
  values: Record<string, unknown>,
): StorageResult {
  const presets = getPresets(mode);
  if (presets.length >= MAX_PRESETS_PER_MODE) {
    return { ok: false, error: `Maximum ${MAX_PRESETS_PER_MODE} presets reached.` };
  }
  const now = new Date().toISOString();
  presets.push({
    id: newId(),
    name: name.trim().slice(0, 100),
    mode,
    values,
    createdAt: now,
    updatedAt: now,
  });
  return writePresets(mode, presets);
}

export function overwritePreset(
  mode: PresetMode,
  id: string,
  values: Record<string, unknown>,
): StorageResult {
  const presets = getPresets(mode);
  const index = presets.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, error: "Preset not found." };
  presets[index] = { ...presets[index], values, updatedAt: new Date().toISOString() };
  return writePresets(mode, presets);
}

export function renamePreset(mode: PresetMode, id: string, name: string): StorageResult {
  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { ok: false, error: "Name cannot be empty." };
  const presets = getPresets(mode);
  if (presets.some((p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "Another preset already uses this name." };
  }
  const index = presets.findIndex((p) => p.id === id);
  if (index < 0) return { ok: false, error: "Preset not found." };
  presets[index] = { ...presets[index], name: trimmed, updatedAt: new Date().toISOString() };
  return writePresets(mode, presets);
}

export function uniqueName(mode: PresetMode, base: string): string {
  const existing = new Set(getPresets(mode).map((p) => p.name.toLowerCase()));
  let candidate = base;
  let n = 2;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${base} (${n})`;
    n += 1;
  }
  return candidate.slice(0, 100);
}

export function duplicatePreset(mode: PresetMode, id: string): StorageResult {
  const source = getPresets(mode).find((p) => p.id === id);
  if (!source) return { ok: false, error: "Preset not found." };
  return createPreset(mode, uniqueName(mode, `${source.name} copy`), source.values);
}

export function deletePreset(mode: PresetMode, id: string): StorageResult {
  return writePresets(mode, getPresets(mode).filter((p) => p.id !== id));
}
