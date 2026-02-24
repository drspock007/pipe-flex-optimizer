export type CalcMode = "standard" | "findL" | "findH";

export interface PipeInputs {
  Do: number;           // mm — outer diameter
  t: number;            // mm — wall thickness
  L: number;            // m  — total pipe length
  h: number;            // mm — total differential settlement
  grade: string;
  customYield: number;  // MPa
  E: number;            // GPa (converted to MPa internally)
  allowablePercent: number; // %
  includeSelfWeight: boolean;
  density: number;      // kg/m³
  calcMode: CalcMode;
  targetSupports: number; // legacy
}

export interface SectionProperties {
  Di: number;           // mm
  A: number;            // mm²
  I: number;            // mm⁴
  c: number;            // mm
  weightPerMeter: number; // kg/m
}

export interface DebugInfo {
  q_Nmm: number;
  q_Nm: number;
  L_mm: number;
  I: number;
  c: number;
  maxMoment: number;
  maxMomentLocation: number;
  maxStress: number;
  allowableStress: number;
  M_end_theory: number;
  femTheoryRatio: number;
  // V2 additions
  elementsPerSpan: number;
  totalDofs: number;
  solveTimeMs: number;
  errorPercent: number;
  // Settlement-only validation
  M_settlement_theory: number;
  M_settlement_fem: number;
  settlementErrorPercent: number;
  validationPassed: boolean;
  warnings: string[];
}

export interface CalculationResults {
  section: SectionProperties;
  yieldStrength: number;
  allowableStress: number;
  q: number;                 // N/mm
  maxStress: number;
  isSafe: boolean;
  numSupports: number;
  spanLength: number;        // m
  governingSpan: number;
  stressData: { x: number; stress: number }[];
  deflectionData: { x: number; w: number }[];
  supportPositions: number[];
  calcMode: CalcMode;
  computedL?: number;
  computedH?: number;
  debug: DebugInfo;
}

// ── Material grades ──
const GRADES: Record<string, number> = {
  "API 5L X52": 359,
  "API 5L X60": 415,
  "API 5L X65": 450,
  "API 5L X70": 485,
};
export const getGradeOptions = () => [...Object.keys(GRADES), "Custom"];
export const getYieldStrength = (grade: string, customYield: number): number =>
  GRADES[grade] ?? customYield;

// ══════════════════════════════════════════════
// SECTION PROPERTIES  (all mm-based)
// ══════════════════════════════════════════════
export const calcSectionProperties = (
  Do: number, t: number, density: number
): SectionProperties => {
  const Di = Do - 2 * t;
  const A  = (Math.PI / 4)  * (Do * Do - Di * Di);
  const I  = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const c  = Do / 2;
  const weightPerMeter = density * A * 1e-6;
  return { Di, A, I, c, weightPerMeter };
};

// ══════════════════════════════════════════════
// Self-weight q
// ══════════════════════════════════════════════
function computeQ(density: number, g: number, A_mm2: number): { q_Nmm: number; q_Nm: number } {
  const A_m2 = A_mm2 * 1e-6;
  const q_Nm  = density * g * A_m2;
  const q_Nmm = q_Nm / 1000;
  return { q_Nmm, q_Nm };
}

// ══════════════════════════════════════════════
// Unit assertions
// ══════════════════════════════════════════════
function assertUnits(E_mpa: number, I: number, q: number, L_mm: number, warnings: string[]) {
  if (E_mpa < 1000) warnings.push(`⚠️ E=${E_mpa} seems too low for MPa — expected ~200000`);
  if (I < 1) warnings.push(`⚠️ I=${I} seems too low for mm⁴`);
  if (q > 1) warnings.push(`⚠️ q=${q} N/mm seems too high — check units`);
  if (L_mm < 100) warnings.push(`⚠️ L=${L_mm} mm seems very short`);
}

// ══════════════════════════════════════════════
// MAIN ENTRY POINT — FEM solver
// ══════════════════════════════════════════════
import {
  solveFEM, autoSupportsFEM, findMaxLFEM, findMaxHFEM, buildEqualSupports
} from "./fem-solver";

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent,
          includeSelfWeight, density, calcMode } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);

  const E_mpa = E * 1000;  // GPa → MPa
  const { q_Nmm, q_Nm } = includeSelfWeight
    ? computeQ(density, 9.81, section.A)
    : { q_Nmm: 0, q_Nm: 0 };

  let L = inputs.L;
  let h = inputs.h;
  let computedL: number | undefined;
  let computedH: number | undefined;
  let numSupports = 0;
  let maxStress = Infinity;
  let maxMoment = 0;
  let maxMomentLocation = 0;
  let stressData: { x: number; stress: number }[] = [];
  let deflectionData: { x: number; w: number }[] = [];
  let supportPositions: number[] = [];
  let elementsPerSpan = 8;
  let totalDofs = 0;
  let solveTimeMs = 0;
  let femWarnings: string[] = [];

  // Unit assertions
  const unitWarnings: string[] = [];
  assertUnits(E_mpa, section.I, q_Nmm, L * 1000, unitWarnings);

  if (calcMode === "findL") {
    const r = findMaxLFEM(E_mpa, section.I, section.c, q_Nmm, h, allowableStress);
    if (r) {
      computedL = r.L_m;
      numSupports = r.numSupports;
      L = r.L_m;
      maxStress = r.result.maxStress;
      maxMoment = r.result.maxMoment;
      maxMomentLocation = r.result.maxMomentLocation;
      stressData = r.result.stressData;
      deflectionData = r.result.deflectionData;
      elementsPerSpan = r.result.meshInfo.elementsPerSpan;
      totalDofs = r.result.meshInfo.totalDofs;
      solveTimeMs = r.result.meshInfo.solveTimeMs;
      femWarnings = r.result.warnings;
    }
  } else if (calcMode === "findH") {
    const L_mm = inputs.L * 1000;
    const r = findMaxHFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, allowableStress);
    if (r) {
      computedH = r.h_mm;
      numSupports = r.numSupports;
      h = r.h_mm;
      maxStress = r.result.maxStress;
      maxMoment = r.result.maxMoment;
      maxMomentLocation = r.result.maxMomentLocation;
      stressData = r.result.stressData;
      deflectionData = r.result.deflectionData;
      elementsPerSpan = r.result.meshInfo.elementsPerSpan;
      totalDofs = r.result.meshInfo.totalDofs;
      solveTimeMs = r.result.meshInfo.solveTimeMs;
      femWarnings = r.result.warnings;
    }
  } else {
    const L_mm = L * 1000;
    const r = autoSupportsFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, h, allowableStress);
    numSupports = r.numSupports;
    maxStress = r.stress;
    maxMoment = r.result.maxMoment;
    maxMomentLocation = r.result.maxMomentLocation;
    stressData = r.result.stressData;
    deflectionData = r.result.deflectionData;
    elementsPerSpan = r.result.meshInfo.elementsPerSpan;
    totalDofs = r.result.meshInfo.totalDofs;
    solveTimeMs = r.result.meshInfo.solveTimeMs;
    femWarnings = r.result.warnings;
  }

  const L_mm = L * 1000;
  const supports_mm = buildEqualSupports(L_mm, numSupports);
  supportPositions = supports_mm.map(x => x / 1000);

  if (stressData.length === 0) {
    const result = solveFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, h, supports_mm, true);
    maxStress = result.maxStress;
    maxMoment = result.maxMoment;
    maxMomentLocation = result.maxMomentLocation;
    stressData = result.stressData;
    deflectionData = result.deflectionData;
    elementsPerSpan = result.meshInfo.elementsPerSpan;
    totalDofs = result.meshInfo.totalDofs;
    solveTimeMs = result.meshInfo.solveTimeMs;
    femWarnings = result.warnings;
  }

  const Nsp = numSupports + 1;
  const isSafe = maxStress <= allowableStress;
  const spanLength = L / Nsp;

  // Sanity check: theoretical fixed-fixed end moment (self-weight only, h=0, no supports)
  const M_end_theory = q_Nmm > 0 ? (q_Nmm * L_mm * L_mm) / 12 : 0;
  const femTheoryRatio = M_end_theory > 0 && numSupports === 0 && h === 0 ? maxMoment / M_end_theory : 0;
  const errorPercent = M_end_theory > 0 && numSupports === 0 && h === 0 ? Math.abs(maxMoment - M_end_theory) / M_end_theory * 100 : 0;

  // Settlement-only validation: M = 6EIh/L² for fixed-fixed beam
  const M_settlement_theory = h > 0 && q_Nmm === 0 ? (6 * E_mpa * section.I * h) / (L_mm * L_mm) : 0;
  // Run a settlement-only solve if needed for validation
  let M_settlement_fem = 0;
  let settlementErrorPercent = 0;
  if (h > 0 && numSupports === 0) {
    // Use the actual FEM moment for settlement validation when no self-weight
    if (q_Nmm === 0) {
      M_settlement_fem = maxMoment;
      settlementErrorPercent = M_settlement_theory > 0 ? Math.abs(M_settlement_fem - M_settlement_theory) / M_settlement_theory * 100 : 0;
    }
  }

  // Validation: self-weight check
  if (numSupports === 0 && h === 0 && q_Nmm > 0 && errorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Self-weight FEM/theory error ${errorPercent.toFixed(1)}% > 5%`);
  }
  // Validation: settlement check
  if (q_Nmm === 0 && h > 0 && numSupports === 0 && settlementErrorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Settlement FEM/theory error ${settlementErrorPercent.toFixed(1)}% > 5%`);
  }

  const validationPassed = !(
    (numSupports === 0 && h === 0 && q_Nmm > 0 && errorPercent > 5) ||
    (q_Nmm === 0 && h > 0 && numSupports === 0 && settlementErrorPercent > 5)
  );

  const allWarnings = [...unitWarnings, ...femWarnings];

  const debug: DebugInfo = {
    q_Nmm, q_Nm, L_mm, I: section.I, c: section.c,
    maxMoment, maxMomentLocation, maxStress, allowableStress,
    M_end_theory, femTheoryRatio,
    elementsPerSpan, totalDofs, solveTimeMs, errorPercent,
    M_settlement_theory, M_settlement_fem, settlementErrorPercent, validationPassed,
    warnings: allWarnings,
  };

  return {
    section, yieldStrength, allowableStress, q: q_Nmm, maxStress, isSafe,
    numSupports, spanLength, governingSpan: 0, stressData, deflectionData,
    supportPositions, calcMode, computedL, computedH, debug,
  };
};
