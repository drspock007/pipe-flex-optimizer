// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 17:40 CEST (Europe/Rome, UTC+2): Find h (V2-4).
// Typed bridge between application inputs and the V2 engine. All unit
// conversions to engine units (mm, N, MPa) are centralized here:
//   L: m -> mm (x1000); E: GPa -> MPa (x1000); Do, t, h, hl already in mm;
//   A in mm2, I in mm4 (calcSectionProperties); q in N/mm; sigmaAllow in MPa.
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: groundZ (mm) passed only when enabled.
// hv = h exactly (positive upward); the legacy vertical sign inversion is not used.

import { calcSectionProperties, getYieldStrength, SectionProperties } from "@/lib/calculations";
import { findNpsByOd } from "@/lib/pipe-presets";
import { BiaxialInput, RestrainedHeightInput, RestrainedLengthInput, GroundLengthInput, HeightSearchInput, LengthSearchInput } from "@/lib/mechanics-v2";
import { AppInputs } from "./inputs";

export const M_TO_MM = 1000;
export const GPA_TO_MPA = 1000;
export const G = 9.81; // m/s2, same value as the legacy calculator

export interface Derived {
  section: SectionProperties;
  yieldStrength: number; // MPa
  allowableStress: number; // MPa
  q: number; // N/mm
  E_MPa: number;
}

export function derive(i: AppInputs): Derived {
  const section = calcSectionProperties(i.Do, i.t, i.density, i.coatingType, i.coatingThickness, i.coatingDensity, findNpsByOd(i.Do));
  const yieldStrength = getYieldStrength(i.grade, i.customYield);
  // Steel weight (kg/m) + coating weight (kg/m), times g, in N/m -> N/mm.
  const q = i.includeSelfWeight ? ((section.weightPerMeter + section.coatingWeightPerMeter) * G) / M_TO_MM : 0;
  return { section, yieldStrength, allowableStress: (yieldStrength * i.allowablePercent) / 100, q, E_MPa: i.E * GPA_TO_MPA };
}

export function toSearchInput(i: AppInputs, d: Derived = derive(i)): LengthSearchInput {
  return {
    hv: i.h, hl: i.hl, E: d.E_MPa, A: d.section.A, I: d.section.I, c: d.section.c,
    q: d.q, sigmaAllow: d.allowableStress, axialMode: i.axialMode,
  };
}

/** hv defaults to the entered h; Find h passes the represented hv instead. */
export type FixedInput = BiaxialInput & { groundZ?: number };

export function toFixedInput(i: AppInputs, L_mm: number, numSupports: number, d: Derived = derive(i), hv: number = i.h): FixedInput {
  const base = { ...toSearchInput(i, d), hv, L: L_mm, numSupports };
  return i.groundEnabled ? { ...base, groundZ: i.groundContactZ } : base;
}

/** Find h input: fixed L (m -> mm) and hl; hv is the searched quantity. */
export function toHeightInput(i: AppInputs, d: Derived = derive(i)): HeightSearchInput {
  const { hv: _hv, ...rest } = toSearchInput(i, d);
  return { ...rest, L: i.L * M_TO_MM };
}

/** Find h restrained input (V2-10): groundZ only when the ground is enabled. */
export function toRestrainedHeightInput(i: AppInputs, d: Derived = derive(i)): RestrainedHeightInput {
  const base = { ...toHeightInput(i, d), axialMode: "restrained" as const };
  return i.groundEnabled ? { ...base, groundZ: i.groundContactZ } : base;
}

/** Key of everything that influences the search: length searches ignore L,
 *  Find h ignores the entered h (it neither limits nor drives the search). */
/** Ground contact is available in every mode since V2-8 (kept for callers). */
export const groundBlocksSearch = (_i: AppInputs) => false;
export const isMinGround = (i: AppInputs) => i.groundEnabled && i.mode === "minSupports";
/** Find L with ground, free sliding (V2-7). */
export const isLengthGround = (i: AppInputs) => i.groundEnabled && i.mode === "searchLength" && i.axialMode !== "restrained";
/** Find L restrained, with or without ground (V2-11). */
export const isLengthRestrained = (i: AppInputs) => i.mode === "searchLength" && i.axialMode === "restrained";
/** Exploratory Find L on a user domain [Lmin, Lmax] (ground and/or restrained). */
export const isLengthExplore = (i: AppInputs) => isLengthGround(i) || isLengthRestrained(i);

/** Find L with ground input: domain m -> mm. */
export function toLengthGroundInput(i: AppInputs, d: Derived = derive(i)): GroundLengthInput {
  return { ...toSearchInput(i, d), groundZ: i.groundContactZ, Lmin: i.searchLmin * M_TO_MM, Lmax: i.searchLmax * M_TO_MM };
}

/** Find L restrained input: domain m -> mm; groundZ only when the ground is enabled. */
export function toLengthRestrainedInput(i: AppInputs, d: Derived = derive(i)): RestrainedLengthInput {
  const base = { ...toSearchInput(i, d), axialMode: "restrained" as const, Lmin: i.searchLmin * M_TO_MM, Lmax: i.searchLmax * M_TO_MM };
  return i.groundEnabled ? { ...base, groundZ: i.groundContactZ } : base;
}

export function searchKey(i: AppInputs): string {
  if (i.mode === "findH") { const { h: _h, searchLmin: _a, searchLmax: _b, ...rest } = i; return JSON.stringify(rest); }
  const { L: _L, searchLmin, searchLmax, ...rest } = i;
  // The domain only matters for Find L / Min. supports with ground; the installed
  // count does not drive Min. supports with ground (the candidate count does).
  if (isMinGround(i)) { const { numSupports: _n, ...r2 } = rest; return JSON.stringify({ ...r2, searchLmin, searchLmax }); }
  return JSON.stringify(isLengthExplore(i) ? { ...rest, searchLmin, searchLmax } : rest);
}

/** Key of a fixed-length solve request: physical inputs + represented L, supports and hv. */
export function solveKeyOf(i: AppInputs, t: { L_mm: number; numSupports: number; hv_mm?: number } | null): string | null {
  return t ? `${searchKey(i)}|${t.L_mm}|${t.numSupports}|${t.hv_mm ?? i.h}` : null;
}
