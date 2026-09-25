// créé par Giovanni Malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Typed bridge between application inputs and the V2 engine. All unit
// conversions to engine units (mm, N, MPa) are centralized here:
//   L: m -> mm (x1000); E: GPa -> MPa (x1000); Do, t, h, hl already in mm;
//   A in mm2, I in mm4 (calcSectionProperties); q in N/mm; sigmaAllow in MPa.
// hv = h exactly (positive upward); the legacy vertical sign inversion is not used.

import { calcSectionProperties, getYieldStrength, SectionProperties } from "@/lib/calculations";
import { findNpsByOd } from "@/lib/pipe-presets";
import { BiaxialInput, LengthSearchInput } from "@/lib/mechanics-v2";
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

export function toFixedInput(i: AppInputs, L_mm: number, numSupports: number, d: Derived = derive(i)): BiaxialInput {
  return { ...toSearchInput(i, d), L: L_mm, numSupports };
}

/** Key of everything that influences the search (not the fixed length L). */
export function searchKey(i: AppInputs): string {
  const { L: _L, ...rest } = i;
  return JSON.stringify(rest);
}

/** Key of a fixed-length solve request: physical inputs + represented length + supports. */
export function solveKeyOf(i: AppInputs, t: { L_mm: number; numSupports: number } | null): string | null {
  return t ? `${searchKey(i)}|${t.L_mm}|${t.numSupports}` : null;
}
