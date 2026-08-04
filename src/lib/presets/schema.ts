// src/lib/presets/schema.ts
// Versioned preset storage schema. Kept mode-based so future calculators can add their own mode.

import { z } from "zod";

export type PresetMode = "lowering";

export const PRESET_MODES: PresetMode[] = ["lowering"];

export const presetModeSchema = z.enum(["lowering"]);

export const presetEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  mode: presetModeSchema,
  values: z.record(z.unknown()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PresetEntry = z.infer<typeof presetEntrySchema>;

/** Legacy (v1) shape: a bare array without id / mode / updatedAt. */
export const legacyPresetEntrySchema = z.object({
  name: z.string().min(1).max(100),
  values: z.record(z.unknown()),
  createdAt: z.string(),
});

export const storeSchema = z.object({
  schemaVersion: z.literal(2),
  presets: z.array(presetEntrySchema),
});

export const MAX_PRESETS_PER_MODE = 50;
export const MAX_IMPORT_BYTES = 1024 * 1024;

export function storageKey(mode: PresetMode): string {
  return `pipe-lowering-presets-${mode}`;
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface StorageResult {
  ok: boolean;
  error?: string;
}

export const MODE_LABELS: Record<PresetMode, string> = {
  lowering: "Pipe lowering",
};
