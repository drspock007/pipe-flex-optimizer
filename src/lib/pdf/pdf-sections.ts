// Modifié par Giovanni malagnino, 2026-09-25 01:21 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-25 20:10 CEST: ground contact rows, Find h labels (V2-5).
// Builds structured report rows (label / value) from V2 inputs and results.

import { axialRows, COMBINED_NOTE, RESTRAINED_MODEL_TEXT, verdictText } from "@/lib/v2-app/axial-text";
import { groundMethodText, groundReactionRows, STRESS_CONVERGENCE_TEXT } from "@/lib/v2-app/ground-labels";
import { formatMomentPair, UnitSystem, UnitType, toDisplay, unitLabel } from "@/lib/unit-conversions";
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
    ["Calculation mode", inputs.mode === "searchLength" && inputs.groundEnabled ? "Length range search WITH ground contact (exploratory, fixed hv and hl)"
      : inputs.mode === "minSupports" && inputs.groundEnabled ? "Minimum installed supports search WITH ground contact (exploratory length searches)" : MODE_LABEL[inputs.mode]],
    ...(s.axial ? [] : [["Axial mode", "Free longitudinal sliding"] as Row]),
  ];
  if (rep.searchStatus) results.push(["Search status", rep.searchStatus]);
  rep.ranges.forEach((r, i) => results.push([inputs.mode === "findH" ? `Admissible hv range ${i + 1}${rep.searchNotes ? " (estimated)" : ""}` : `Admissible range ${i + 1}`, r]));
  rep.searchNotes?.forEach((r) => results.push(r));
  if (inputs.mode === "findH") results.push(["Fixed length L", fmt(s.L / 1000, "m", 3)], ["Fixed lateral offset hl", fmt(inputs.hl, "mm")], ["Represented vertical offset hv", fmt(inputs.h, "mm")]);
  results.push(
    ...(inputs.mode === "findH" ? [] : [["Represented length L", fmt(s.L / 1000, "m", 3)] as Row]),
    ["Installed supports / active contacts", `${s.supports.length} / ${s.supports.filter((x) => x.active).length}`],
    ["Max resultant bending stress", fmt(s.maxStress, "MPa", 2)],
    ["Allowable stress", fmt(s.sigmaAllow, "MPa", 2)],
    ["Position of the maximum", fmt(s.critical.x / 1000, "m", 3)],
    ["Moments at max (vertical / lateral)", formatMomentPair(s.critical.Mv, s.critical.Ml, system)],
    [s.axial ? "Combined normal stress criterion at represented length (governs)" : inputs.mode === "findH" ? "Bending criterion at represented hv" : "Bending criterion at represented length", verdictText(s).uncertain ? "UNCERTAIN (mesh precision)" : verdictText(s).met ? "met" : "NOT met"],
    ["Numerical validity", s.numericalValid ? "valid" : "NOT valid"],
    [s.axial ? "Physical validity (see domain indicators)" : "Physical validity (linear model)", "not assessed"],
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
    ...(s.axial ? [] : [["Model", "Linear Euler-Bernoulli, small rotations, fixed ends"] as Row]),
    ["Supports", "Equally spaced, unilateral vertical contact, no lateral restraint"],
    ...(s.axial ? [["Model", RESTRAINED_MODEL_TEXT] as Row, ["Combined stress", COMBINED_NOTE] as Row, ["Not covered", "Friction, temperature, internal pressure, plasticity, exact large rotations, 3D effects"] as Row]
      : [["Not covered", "Axial restraint, large displacements, 3D effects"] as Row]),
  ];
  const g = s.ground;
  const ground: Row[] = [["Ground contact", g ? "enabled" : "disabled"]];
  if (g) {
    ground.push(
      ["Minimum pipe-axis elevation", fmt(g.level, "mm", 1)],
      ["Assumptions", "Rigid, horizontal, frictionless ground over the full length, vertical plane only"],
      ...groundReactionRows(g, (v) => fmt(v, "N", 1)).map(([k, v, n]) => [k, `${v} (${n})`] as Row),
      ["Discrete contact nodes", String(g.contactNodes)],
      ["Estimated zones near the ground (graphical grouping)", g.contactZones.length ? g.contactZones.map((z) => `${fmt(z.xStart / 1000, "m", 3)} - ${fmt(z.xEnd / 1000, "m", 3)}`).join("; ") : "none"],
      ["Max residual penetration", `${c(g.maxPenetration, "mm").toExponential(2)} ${u("mm")}`],
      ["Calculation method", groundMethodText(g, (mm) => fmt(mm, "mm", 3))],
      [s.axial ? "Combined criterion vs mesh precision" : "Bending criterion vs mesh precision", g.criterionUncertain ? "UNCERTAIN - not decidable at the convergence precision" : "decidable"],
      ["Maximum stress", "Computed on the discretized model with mesh-convergence control"],
      ["Stress convergence", STRESS_CONVERGENCE_TEXT],
      ["Model limits", "Numerical approximation (beam elements + nodal unilateral contacts), not an exact analytical solution"],
    );
  }

  const sections: Section[] = [
    { title: "Results summary", rows: results },
    { title: "Geometry", rows: geometry },
    { title: "Material, section & loading", rows: material },
  ];
  if (s.axial) sections.push({ title: "Axial restraint (coupled solution)", rows: axialRows(s.axial, s, { force: (v) => fmt(v, "N", 1), stress: (v) => fmt(v, "MPa", 2), length: (mm) => fmt(mm / 1000, "m", 3) }) });
  sections.push({ title: "Ground contact", rows: ground });
  if (supports.length) sections.push({ title: "Supports", rows: supports });
  sections.push({ title: "Model limits", rows: limits });
  return sections;
};
