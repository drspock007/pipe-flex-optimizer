// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Application inputs for the V2 engine (stored in display-independent SI-ish
// units as before: L in m, h/hl/Do/t in mm, E in GPa). Conversion to engine
// units happens only in bridge.ts. Legacy presets are normalized here with
// explicit defaults for the new fields.
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground contact (V2-5).
// Modifié par Giovanni Malagnino, 2026-09-26 04:30 CEST: Find L search domain (V2-7).

import { MAX_SUPPORTS } from "@/lib/mechanics-v2";

export type AppMode = "fixedLength" | "searchLength" | "minSupports" | "findH";
export type AppAxialMode = "free" | "restrained";

export interface AppInputs {
  Do: number; // mm
  t: number; // mm
  L: number; // m, used by the fixed-length mode only
  h: number; // mm, = hv (positive when the right end is higher), never negated
  hl: number; // mm, signed lateral end offset
  grade: string;
  customYield: number; // MPa
  E: number; // GPa
  allowablePercent: number; // %
  includeSelfWeight: boolean;
  density: number; // kg/m3
  coatingType: string;
  coatingThickness: number; // mm
  coatingDensity: number; // kg/m3
  mode: AppMode;
  numSupports: number; // installed candidate supports, integer 0..20
  maxSupports: number; // search ceiling, integer 0..20
  axialMode: AppAxialMode;
  groundEnabled: boolean; // rigid horizontal frictionless ground (Fixed L, Find L, Find h)
  groundContactZ: number; // mm, minimum pipe-AXIS elevation (ground + outer radius incl. coating)
  searchLmin: number; // m, Find L with ground: exploration domain (not a mechanical bound)
  searchLmax: number; // m
}

export const DEFAULT_INPUTS: AppInputs = {
  Do: 114.3, t: 6.02, L: 30, h: 2500, hl: 0,
  grade: "X52", customYield: 359, E: 207,
  allowablePercent: 80, includeSelfWeight: true, density: 7850,
  coatingType: "none", coatingThickness: 1.5, coatingDensity: 950,
  mode: "fixedLength", numSupports: 0, maxSupports: MAX_SUPPORTS, axialMode: "free",
  groundEnabled: false, groundContactZ: 0, searchLmin: 7.5, searchLmax: 120,
};

const LEGACY_MODE: Record<string, AppMode> = {
  standard: "fixedLength", findL: "searchLength", findH: "findH",
};
const MODES: AppMode[] = ["fixedLength", "searchLength", "minSupports", "findH"];

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const count = (v: unknown, d: number) => {
  const n = num(v, d);
  return Number.isInteger(n) && n >= 0 && n <= MAX_SUPPORTS ? n : d;
};

/** Read stored values (current or legacy preset) into complete AppInputs. */
export function normalizeAppInputs(values: Record<string, unknown>, base: AppInputs = DEFAULT_INPUTS): AppInputs {
  const out: AppInputs = { ...base };
  for (const k of ["Do", "t", "L", "h", "customYield", "E", "allowablePercent", "density", "coatingThickness", "coatingDensity"] as const) {
    out[k] = num(values[k], base[k]);
  }
  for (const k of ["grade", "coatingType"] as const) if (typeof values[k] === "string") out[k] = values[k] as string;
  if (typeof values.includeSelfWeight === "boolean") out.includeSelfWeight = values.includeSelfWeight;
  // New fields: explicit defaults when absent (legacy presets).
  out.hl = num(values.hl, 0);
  out.axialMode = values.axialMode === "restrained" ? "restrained" : "free";
  const m = values.mode ?? values.calcMode;
  out.mode = MODES.includes(m as AppMode) ? (m as AppMode) : LEGACY_MODE[m as string] ?? base.mode;
  out.numSupports = count(values.numSupports ?? values.targetSupports, 0);
  out.maxSupports = count(values.maxSupports, MAX_SUPPORTS);
  // Legacy presets: ground disabled.
  out.groundEnabled = values.groundEnabled === true;
  out.groundContactZ = num(values.groundContactZ, 0);
  // Legacy presets without a domain: initialized ONCE around the stored L ([L/4, 4L]).
  const L0 = out.L > 0 ? out.L : DEFAULT_INPUTS.L;
  out.searchLmin = num(values.searchLmin, L0 / 4);
  out.searchLmax = num(values.searchLmax, L0 * 4);
  return out;
}
