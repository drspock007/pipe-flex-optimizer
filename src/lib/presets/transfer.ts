// src/lib/presets/transfer.ts
// Export / import of presets as JSON files, to move them between devices.

import { z } from "zod";
import {
  MAX_IMPORT_BYTES,
  MAX_PRESETS_PER_MODE,
  PRESET_MODES,
  PresetEntry,
  PresetMode,
  legacyPresetEntrySchema,
  newId,
  presetEntrySchema,
  presetModeSchema,
} from "./schema";
import { getPresets, uniqueName, writePresets } from "./crud";

/* ── Export ─────────────────────────────────────────────── */

export function buildExportPayload(modes: PresetMode[]): string {
  const byMode: Partial<Record<PresetMode, PresetEntry[]>> = {};
  modes.forEach((m) => {
    byMode[m] = getPresets(m);
  });
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), modes: byMode }, null, 2);
}

export function downloadJSON(filename: string, json: string): void {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Import parsing ─────────────────────────────────────── */

const fileV2Schema = z.object({
  version: z.literal(2),
  exportedAt: z.string().optional(),
  modes: z.record(presetModeSchema, z.array(presetEntrySchema)),
});

const fileV1Schema = z.object({
  version: z.literal(1),
  mode: presetModeSchema,
  exportedAt: z.string().optional(),
  presets: z.array(legacyPresetEntrySchema),
});

export type ParsedImport = Partial<Record<PresetMode, PresetEntry[]>>;

export interface ParseResult {
  data?: ParsedImport;
  error?: string;
}

export function parseImportFile(jsonString: string): ParseResult {
  if (jsonString.length > MAX_IMPORT_BYTES) return { error: "File too large (max 1 MB)" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { error: "Invalid JSON file" };
  }

  const v2 = fileV2Schema.safeParse(parsed);
  if (v2.success) {
    const data: ParsedImport = {};
    PRESET_MODES.forEach((m) => {
      const list = v2.data.modes[m];
      if (list?.length) data[m] = list.map((p) => ({ ...p, mode: m }));
    });
    return { data };
  }

  const v1 = fileV1Schema.safeParse(parsed);
  if (v1.success) {
    const mode = v1.data.mode;
    return {
      data: {
        [mode]: v1.data.presets.map((p) => ({
          id: newId(),
          name: p.name,
          mode,
          values: p.values,
          createdAt: p.createdAt,
          updatedAt: p.createdAt,
        })),
      },
    };
  }

  return { error: "Unrecognised preset file structure" };
}

/* ── Import application ─────────────────────────────────── */

export type ConflictStrategy = "skip" | "rename" | "replace";

export interface ApplyResult {
  imported: number;
  replaced: number;
  skipped: number;
  overLimit: number;
  error?: string;
}

function uniqueNameAgainst(list: PresetEntry[], base: string): string {
  const existing = new Set(list.map((p) => p.name.toLowerCase()));
  let candidate = base;
  let n = 2;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${base} (${n})`;
    n += 1;
  }
  return candidate.slice(0, 100);
}

export function applyImport(data: ParsedImport, strategy: ConflictStrategy): ApplyResult {
  const result: ApplyResult = { imported: 0, replaced: 0, skipped: 0, overLimit: 0 };

  for (const mode of PRESET_MODES) {
    const incoming = data[mode];
    if (!incoming?.length) continue;

    const current = getPresets(mode);
    for (const preset of incoming) {
      const existingIndex = current.findIndex(
        (p) => p.name.toLowerCase() === preset.name.toLowerCase(),
      );

      if (existingIndex >= 0) {
        if (strategy === "skip") {
          result.skipped += 1;
          continue;
        }
        if (strategy === "replace") {
          current[existingIndex] = {
            ...preset,
            id: current[existingIndex].id,
            mode,
            updatedAt: new Date().toISOString(),
          };
          result.replaced += 1;
          continue;
        }
      }

      if (current.length >= MAX_PRESETS_PER_MODE) {
        result.overLimit += 1;
        continue;
      }

      const name = existingIndex >= 0 ? uniqueNameAgainst(current, preset.name) : preset.name;
      current.push({ ...preset, id: newId(), mode, name });
      result.imported += 1;
    }

    const write = writePresets(mode, current);
    if (!write.ok) return { ...result, error: write.error };
  }

  return result;
}

export { uniqueName };
