// src/lib/unit-conversions.ts
// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Unit conversion utilities — display layer only, internal engine stays SI.

export type UnitSystem = "SI" | "Imperial";

export type UnitType =
  | "mm" | "m" | "MPa" | "GPa"
  | "kg/m3" | "kg/m" | "mm2" | "mm4" | "N/mm" | "N" | "kN·m";

interface UnitDef {
  impLabel: string;
  factor: number; // SI value ÷ factor = Imperial value
}

const UNIT_DEFS: Record<UnitType, UnitDef> = {
  mm:      { impLabel: "in",     factor: 25.4 },
  m:       { impLabel: "ft",     factor: 0.3048 },
  MPa:     { impLabel: "ksi",    factor: 6.89476 },
  GPa:     { impLabel: "×10³ ksi", factor: 6.89476 },
  "kg/m3": { impLabel: "lb/ft³", factor: 16.0185 },
  "kg/m":  { impLabel: "lb/ft",  factor: 1.48816 },
  mm2:     { impLabel: "in²",    factor: 645.16 },
  mm4:     { impLabel: "in⁴",    factor: 416231.426 },
  "N/mm":  { impLabel: "lbf/in", factor: 0.17513 },
  N:       { impLabel: "lbf",    factor: 4.44822 },
  "kN·m":  { impLabel: "kip·ft", factor: 1.35582 },
};

/** Convert an internal SI value to the display value for the active system. */
export const toDisplay = (value: number, unit: UnitType, system: UnitSystem): number =>
  system === "SI" ? value : value / UNIT_DEFS[unit].factor;

/** Convert a user-entered display value back to internal SI. */
export const fromDisplay = (value: number, unit: UnitType, system: UnitSystem): number =>
  system === "SI" ? value : value * UNIT_DEFS[unit].factor;

/** Return the unit label string for the active system. */
export const unitLabel = (unit: UnitType, system: UnitSystem): string =>
  system === "SI" ? unit : UNIT_DEFS[unit].impLabel;

/** Shared moment formatter (screen and PDF): moments given in N·mm. */
export const formatMomentPair = (mvNmm: number, mlNmm: number, system: UnitSystem, digits = 2): string =>
  `${toDisplay(mvNmm / 1e6, "kN·m", system).toFixed(digits)} / ${toDisplay(mlNmm / 1e6, "kN·m", system).toFixed(digits)} ${unitLabel("kN·m", system)}`;
