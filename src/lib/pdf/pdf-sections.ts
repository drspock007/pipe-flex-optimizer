// Builds structured report rows (label / value) from inputs and FEM results.

import { PipeInputs, CalculationResults } from "@/lib/calculations";
import { UnitSystem, UnitType, toDisplay, unitLabel } from "@/lib/unit-conversions";
import { COATING_OPTIONS } from "@/lib/coating-presets";

export type Row = [string, string];
export interface Section {
  title: string;
  rows: Row[];
}

const MODE_LABEL: Record<string, string> = {
  standard: "Standard (fixed L and h)",
  findL: "Find admissible length range",
  findH: "Find maximum settlement",
};

export const buildSections = (
  inputs: PipeInputs,
  r: CalculationResults,
  system: UnitSystem,
): Section[] => {
  const c = (v: number, u: UnitType) => toDisplay(v, u, system);
  const u = (unit: UnitType) => unitLabel(unit, system);
  const fmt = (v: number, unit: UnitType, digits = 2) =>
    `${c(v, unit).toFixed(digits)} ${u(unit)}`;

  const coatingLabel =
    COATING_OPTIONS.find((o) => o.key === inputs.coatingType)?.label ?? inputs.coatingType;

  const geometry: Row[] = [
    ["Outside diameter (Do)", fmt(inputs.Do, "mm")],
    ["Wall thickness (t)", fmt(inputs.t, "mm")],
    ["Inside diameter (Di)", fmt(r.section.Di, "mm")],
    ["Free length (L)", fmt(inputs.L, "m")],
    ["Settlement / lifting height (h)", fmt(inputs.h, "mm")],
  ];

  const material: Row[] = [
    ["Grade", inputs.grade === "CUSTOM" ? "Custom" : inputs.grade],
    ["Yield strength (SMYS)", fmt(r.yieldStrength, "MPa", 1)],
    ["Young's modulus (E)", fmt(inputs.E, "GPa", 1)],
    ["Steel density", fmt(inputs.density, "kg/m3", 0)],
    ["Allowable stress ratio", `${inputs.allowablePercent} % of SMYS`],
    ["Allowable stress", fmt(r.allowableStress, "MPa", 1)],
  ];

  const coating: Row[] = [
    ["Coating type", coatingLabel],
    ["Coating thickness", fmt(inputs.coatingThickness, "mm")],
    ["Coating density", fmt(inputs.coatingDensity, "kg/m3", 0)],
    ["Coating weight", fmt(r.section.coatingWeightPerMeter, "kg/m")],
  ];

  const section: Row[] = [
    ["Cross-section area (A)", fmt(r.section.A, "mm2")],
    ["Moment of inertia (I)", `${c(r.section.I, "mm4").toExponential(3)} ${u("mm4")}`],
    ["Extreme fibre distance (c)", fmt(r.section.c, "mm")],
    ["Pipe weight", fmt(r.section.weightPerMeter, "kg/m")],
    ["Self weight included", inputs.includeSelfWeight ? "Yes" : "No"],
    ["Distributed load (q)", `${c(r.q, "N/mm").toFixed(4)} ${u("N/mm")}`],
  ];

  const activeCount = r.supportStatus.filter((s) => s.active).length;
  const results: Row[] = [
    ["Calculation mode", MODE_LABEL[r.calcMode] ?? r.calcMode],
    ["Maximum bending stress", fmt(r.maxStress, "MPa", 1)],
    ["Allowable stress", fmt(r.allowableStress, "MPa", 1)],
    ["Utilization", `${((r.maxStress / r.allowableStress) * 100).toFixed(1)} %`],
    ["Maximum longitudinal strain", `${r.maxStrain.toFixed(4)} %`],
    ["Candidate supports", `${r.numSupports}`],
    ["Active supports (in contact)", `${activeCount}`],
    ["Span length", fmt(r.spanLength, "m")],
    [
      "Safety status",
      r.calcMode === "findL"
        ? r.hasWindow
          ? "Feasible window found"
          : "No solution"
        : r.isSafeNow
          ? "SAFE"
          : "NOT SAFE",
    ],
  ];

  if (r.calcMode === "findL" && r.computedLmin != null && r.computedLmax != null) {
    results.push(["Admissible L min", fmt(r.computedLmin, "m")]);
    results.push(["Admissible L max", fmt(r.computedLmax, "m")]);
    if (r.L_plot != null) results.push(["Displayed at L", fmt(r.L_plot, "m")]);
  }
  if (r.calcMode === "findH" && r.computedH != null) {
    results.push(["Computed maximum settlement", fmt(r.computedH, "mm")]);
  }

  const supports: Row[] = r.supportStatus.map((s, i) => [
    `Support ${i + 1} @ ${fmt(s.x, "m")}`,
    `${s.active ? "Active" : "Lift-off"} — deflection ${c(s.w_fem, "mm").toFixed(2)} ${u("mm")}`,
  ]);

  const sections: Section[] = [
    { title: "Results summary", rows: results },
    { title: "Geometry", rows: geometry },
    { title: "Material", rows: material },
    { title: "Coating", rows: coating },
    { title: "Section properties & loading", rows: section },
  ];
  if (supports.length) sections.push({ title: "Support status", rows: supports });
  return sections;
};
