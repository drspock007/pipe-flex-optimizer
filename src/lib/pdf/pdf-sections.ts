// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Builds structured report rows (label / value) from V2 inputs and results.

import { UnitSystem, UnitType, toDisplay, unitLabel } from "@/lib/unit-conversions";
import { COATING_LABELS, CoatingType, effectiveCoating } from "@/lib/coating-presets";
import { findNpsByOd } from "@/lib/pipe-presets";
import { AppInputs } from "@/lib/v2-app/inputs";
import { Derived } from "@/lib/v2-app/bridge";
import { V2Report } from "./report-types";

export type Row = [string, string];
export interface Section {
  title: string;
  rows: Row[];
}

const MODE_LABEL: Record<AppInputs["mode"], string> = {
  fixedLength: "Fixed length",
  searchLength: "Length range search (fixed installed supports)",
  minSupports: "Minimum installed supports search",
  findH: "Find h (fixed L, fixed hl, fixed installed supports)",
};

export const buildSections = (inputs: AppInputs, d: Derived, rep: V2Report, system: UnitSystem): Section[] => {
  const c = (v: number, u: UnitType) => toDisplay(v, u, system);
  // Helvetica (WinAnsi) has no superscript 4 glyph: write it as ^4.
  const u = (unit: UnitType) => unitLabel(unit, system).replace("⁴", "^4");
  const fmt = (v: number, unit: UnitType, digits = 2) => `${c(v, unit).toFixed(digits)} ${u(unit)}`;
  const s = rep.solution;
  const coatingLabel = COATING_LABELS[inputs.coatingType as CoatingType] ?? inputs.coatingType;
  // Same effective values as the calculation (Yellow Jacket thickness follows the NPS table).
  const coat = effectiveCoating(inputs.coatingType as CoatingType, inputs.coatingThickness, inputs.coatingDensity, findNpsByOd(inputs.Do));

  const results: Row[] = [
    ["Calculation mode", MODE_LABEL[inputs.mode]],
    ["Axial mode", "Free longitudinal sliding"],
  ];
  if (rep.searchStatus) results.push(["Search status", rep.searchStatus]);
  rep.ranges.forEach((r, i) => results.push([inputs.mode === "findH" ? `Admissible hv range ${i + 1}` : `Admissible range ${i + 1}`, r]));
  if (inputs.mode === "findH") results.push(["Fixed length L", fmt(s.L / 1000, "m", 3)], ["Fixed lateral offset hl", fmt(inputs.hl, "mm")], ["Represented hv (up +)", fmt(inputs.h, "mm")]);
  results.push(
    ...(inputs.mode === "findH" ? [] : [["Represented length L", fmt(s.L / 1000, "m", 3)] as Row]),
    ["Installed supports / active contacts", `${s.supports.length} / ${s.supports.filter((x) => x.active).length}`],
    ["Max resultant bending stress", fmt(s.maxStress, "MPa", 2)],
    ["Allowable stress", fmt(s.sigmaAllow, "MPa", 2)],
    ["Position of the maximum", fmt(s.critical.x / 1000, "m", 3)],
    [inputs.mode === "findH" ? "Bending criterion at represented hv" : "Bending criterion at represented length", s.bendingCriterionMet ? "met" : "NOT met"],
    ["Numerical validity", s.numericalValid ? "valid" : "NOT valid"],
    ["Physical validity (linear model)", "not assessed"],
  );

  const geometry: Row[] = [
    ["Outside diameter (Do)", fmt(inputs.Do, "mm")],
    ["Wall thickness (t)", fmt(inputs.t, "mm")],
    ["Inside diameter (Di)", fmt(d.section.Di, "mm")],
    [inputs.mode === "findH" ? "Represented vertical offset hv (up +)" : "Vertical end offset hv (up +)", fmt(inputs.h, "mm")],
    ["Lateral end offset hl", fmt(inputs.hl, "mm")],
  ];
  if (inputs.mode === "fixedLength" || inputs.mode === "findH") geometry.push(["Imposed length L", fmt(inputs.L, "m", 3)]);

  const material: Row[] = [
    ["Grade", inputs.grade === "CUSTOM" ? "Custom" : inputs.grade],
    ["Yield strength (SMYS)", fmt(d.yieldStrength, "MPa", 1)],
    ["Young's modulus (E)", fmt(inputs.E, "GPa", 1)],
    ["Allowable stress ratio", `${inputs.allowablePercent} % of SMYS`],
    ["Coating", coatingLabel],
    ...(inputs.coatingType === "none" ? [] : [
      ["Effective coating thickness", fmt(coat.thickness, "mm")] as Row,
      ["Coating density", fmt(coat.density, "kg/m3", 1)] as Row,
      ["Coating linear weight", fmt(d.section.coatingWeightPerMeter, "kg/m", 3)] as Row,
    ]),
    ["Cross-section area (A)", fmt(d.section.A, "mm2")],
    ["Moment of inertia (I)", `${c(d.section.I, "mm4").toExponential(3)} ${u("mm4")}`],
    ["Distributed load (q)", `${c(d.q, "N/mm").toFixed(4)} ${u("N/mm")}`],
  ];

  const supports: Row[] = s.supports.map((x) => [
    `Support ${x.index} @ ${fmt(x.x / 1000, "m", 3)}`,
    `${x.active ? "active" : "open"} — reaction ${fmt(x.reaction, "N", 1)}, gap ${fmt(x.gap, "mm")}`,
  ]);

  const limits: Row[] = [
    ["Model", "Linear Euler-Bernoulli, small rotations, fixed ends"],
    ["Supports", "Equally spaced, unilateral vertical contact, no lateral restraint"],
    ["Not covered", "Axial restraint, large displacements, 3D effects"],
  ];

  const sections: Section[] = [
    { title: "Results summary", rows: results },
    { title: "Geometry", rows: geometry },
    { title: "Material, section & loading", rows: material },
  ];
  if (supports.length) sections.push({ title: "Supports", rows: supports });
  sections.push({ title: "Model limits", rows: limits });
  return sections;
};
