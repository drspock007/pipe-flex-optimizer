export type CalcMode = "standard" | "findL" | "findH";

export interface PipeInputs {
  Do: number; // mm — outer diameter
  t: number; // mm — wall thickness
  L: number; // m  — total pipe length
  h: number; // mm — total differential settlement
  grade: string;
  customYield: number; // MPa
  E: number; // GPa (converted to MPa internally)
  allowablePercent: number; // %
  includeSelfWeight: boolean;
  density: number; // kg/m³
  calcMode: CalcMode;
  targetSupports: number; // legacy
}

export interface SectionProperties {
  Di: number; // mm
  A: number; // mm²
  I: number; // mm⁴
  c: number; // mm
  weightPerMeter: number; // kg/m
}

export interface SupportStatusDisplay {
  x: number; // meters
  w_fem: number; // mm
  w_ref: number; // mm
  active: boolean;
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
  elementsPerSpan: number;
  totalDofs: number;
  solveTimeMs: number;
  errorPercent: number;
  M_settlement_theory: number;
  M_settlement_fem: number;
  settlementErrorPercent: number;
  validationPassed: boolean;
  M_theory_span: number;
  M_settle_span: number;
  spanErrorPercent: number;
  // FindL search debug
  searchSupportsUsed?: number;
  searchLminGuess?: number;
  searchLmaxGuess?: number;
  // Contact debug
  contactIterations?: number;
  activeSupportsCount?: number;
  candidateSupportsCount?: number;
  warnings: string[];
}

export interface CalculationResults {
  section: SectionProperties;
  yieldStrength: number;
  allowableStress: number;
  q: number; // N/mm
  maxStress: number;
  isSafe: boolean;
  numSupports: number;
  spanLength: number; // m
  governingSpan: number;
  stressData: { x: number; stress: number }[];
  deflectionData: { x: number; w: number }[];
  supportPositions: number[];
  calcMode: CalcMode;
  computedLmin?: number;
  computedLmax?: number;
  computedH?: number;
  // Unilateral contact data
  supportStatus: SupportStatusDisplay[];
  activeSupports: number[];
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
export const getYieldStrength = (grade: string, customYield: number): number => GRADES[grade] ?? customYield;

// ══════════════════════════════════════════════
// SECTION PROPERTIES  (all mm-based)
// ══════════════════════════════════════════════
export const calcSectionProperties = (Do: number, t: number, density: number): SectionProperties => {
  const Di = Do - 2 * t;
  const A = (Math.PI / 4) * (Do * Do - Di * Di);
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const c = Do / 2;
  const weightPerMeter = density * A * 1e-6;
  return { Di, A, I, c, weightPerMeter };
};

function computeQ(density: number, g: number, A_mm2: number): { q_Nmm: number; q_Nm: number } {
  const A_m2 = A_mm2 * 1e-6;
  const q_Nm = density * g * A_m2;
  const q_Nmm = q_Nm / 1000;
  return { q_Nmm, q_Nm };
}

function assertUnits(E_mpa: number, I: number, q: number, L_mm: number, warnings: string[]) {
  if (E_mpa < 1000) warnings.push(`⚠️ E=${E_mpa} seems too low for MPa — expected ~200000`);
  if (I < 1) warnings.push(`⚠️ I=${I} seems too low for mm⁴`);
  if (q > 1) warnings.push(`⚠️ q=${q} N/mm seems too high — check units`);
  if (L_mm < 100) warnings.push(`⚠️ L=${L_mm} mm seems very short`);
}

// ══════════════════════════════════════════════
// MAIN ENTRY POINT — FEM solver
// ══════════════════════════════════════════════
import { solveFEM, autoSupportsFEM, findLRangeFEM, findMaxHFEM, buildEqualSupports } from "./fem-solver";

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent, includeSelfWeight, density, calcMode } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);

  const E_mpa = E * 1000; // GPa → MPa
  const { q_Nmm, q_Nm } = includeSelfWeight ? computeQ(density, 9.81, section.A) : { q_Nmm: 0, q_Nm: 0 };

  let L = inputs.L;
  let h = inputs.h;
  let computedLmin: number | undefined;
  let computedLmax: number | undefined;
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
  let searchSupportsUsed: number | undefined;
  let searchLminGuess: number | undefined;
  let searchLmaxGuess: number | undefined;
  let contactIterations: number | undefined;
  let activeSupportsCount: number | undefined;
  let candidateSupportsCount: number | undefined;
  let supportStatus: SupportStatusDisplay[] = [];
  let activeSupports: number[] = [];

  // Unit assertions
  const unitWarnings: string[] = [];
  assertUnits(E_mpa, section.I, q_Nmm, L * 1000, unitWarnings);

  if (calcMode === "findL") {
    const r = findLRangeFEM(E_mpa, section.I, section.c, q_Nmm, h, allowableStress);
    if (r) {
      computedLmin = r.Lmin;
      computedLmax = r.Lmax;
      numSupports = r.numSupports;

      // Recommend minimal feasible L (Chef wants Find L => smallest acceptable by default)
      L = r.Lmin;

      maxStress = r.resultAtLmin.maxStress;
      maxMoment = r.resultAtLmin.maxMoment;
      maxMomentLocation = r.resultAtLmin.maxMomentLocation;
      stressData = r.resultAtLmin.stressData;
      deflectionData = r.resultAtLmin.deflectionData;
      elementsPerSpan = r.resultAtLmin.meshInfo.elementsPerSpan;
      totalDofs = r.resultAtLmin.meshInfo.totalDofs;
      solveTimeMs = r.resultAtLmin.meshInfo.solveTimeMs;
      femWarnings = r.resultAtLmin.warnings;
      searchSupportsUsed = r.numSupports;
      searchLminGuess = r.searchLminGuess;
      searchLmaxGuess = r.searchLmaxGuess;
      contactIterations = r.resultAtLmin.contactIterations;
      activeSupports = r.resultAtLmin.activeSupports;
      activeSupportsCount = r.resultAtLmin.activeSupports.length;
      candidateSupportsCount = numSupports;

      supportStatus = r.resultAtLmin.supportStatus.map((s) => ({
        x: s.x_mm / 1000,
        w_fem: s.w_fem,
        w_ref: s.w_ref,
        active: s.active,
      }));
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
      contactIterations = r.result.contactIterations;
      activeSupports = r.result.activeSupports;
      activeSupportsCount = r.result.activeSupports.length;
      candidateSupportsCount = numSupports;
      supportStatus = r.result.supportStatus.map((s) => ({
        x: s.x_mm / 1000,
        w_fem: s.w_fem,
        w_ref: s.w_ref,
        active: s.active,
      }));
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
    contactIterations = r.result.contactIterations;
    activeSupports = r.result.activeSupports;
    activeSupportsCount = r.result.activeSupports.length;
    candidateSupportsCount = numSupports;
    supportStatus = r.result.supportStatus.map((s) => ({
      x: s.x_mm / 1000,
      w_fem: s.w_fem,
      w_ref: s.w_ref,
      active: s.active,
    }));
  }

  const L_mm = L * 1000;

  // Candidate supports displayed (equal-spacing). Active supports are provided via supportStatus/activeSupports.
  const supports_mm = buildEqualSupports(L_mm, numSupports);
  supportPositions = supports_mm.map((x) => x / 1000);

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

  // Safe logic
  const isSafe =
    calcMode === "findL"
      ? computedLmin != null && computedLmax != null && maxStress <= allowableStress + 0.5
      : maxStress <= allowableStress + 0.5;

  const spanLength = L / Nsp;

  // Sanity checks
  const M_end_theory = q_Nmm > 0 ? (q_Nmm * L_mm * L_mm) / 12 : 0;
  const femTheoryRatio = M_end_theory > 0 && numSupports === 0 && h === 0 ? maxMoment / M_end_theory : 0;
  const errorPercent =
    M_end_theory > 0 && numSupports === 0 && h === 0 ? (Math.abs(maxMoment - M_end_theory) / M_end_theory) * 100 : 0;

  const Ls_mm = L_mm / Nsp;
  const hs_mm = h / Nsp;
  const M_theory_span = numSupports > 0 && q_Nmm > 0 ? (q_Nmm * Ls_mm * Ls_mm) / 12 : 0;
  const M_settle_span = numSupports > 0 && h > 0 ? (6 * E_mpa * section.I * hs_mm) / (Ls_mm * Ls_mm) : 0;
  const spanTheoryTotal = M_theory_span + M_settle_span;
  const spanErrorPercent =
    numSupports > 0 && spanTheoryTotal > 0 ? (Math.abs(maxMoment - spanTheoryTotal) / spanTheoryTotal) * 100 : 0;

  const M_settlement_theory = h > 0 ? (6 * E_mpa * section.I * h) / (L_mm * L_mm) : 0;
  let M_settlement_fem = 0;
  let settlementErrorPercent = 0;
  if (h > 0) {
    const settlementResult = solveFEM(E_mpa, section.I, section.c, 0, L_mm, h, [], false);
    M_settlement_fem = settlementResult.maxMoment;
    settlementErrorPercent =
      M_settlement_theory > 0 ? (Math.abs(M_settlement_fem - M_settlement_theory) / M_settlement_theory) * 100 : 0;
  }

  if (numSupports === 0 && h === 0 && q_Nmm > 0 && errorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Self-weight FEM/theory error ${errorPercent.toFixed(1)}% > 5%`);
  }
  if (h > 0 && settlementErrorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Settlement FEM/theory error ${settlementErrorPercent.toFixed(1)}% > 5%`);
  }

  const validationPassed = !(
    (numSupports === 0 && h === 0 && q_Nmm > 0 && errorPercent > 5) ||
    (h > 0 && settlementErrorPercent > 5)
  );

  const allWarnings = [...unitWarnings, ...femWarnings];

  const debug: DebugInfo = {
    q_Nmm,
    q_Nm,
    L_mm,
    I: section.I,
    c: section.c,
    maxMoment,
    maxMomentLocation,
    maxStress,
    allowableStress,
    M_end_theory,
    femTheoryRatio,
    elementsPerSpan,
    totalDofs,
    solveTimeMs,
    errorPercent,
    M_settlement_theory,
    M_settlement_fem,
    settlementErrorPercent,
    validationPassed,
    M_theory_span,
    M_settle_span,
    spanErrorPercent,
    searchSupportsUsed,
    searchLminGuess,
    searchLmaxGuess,
    contactIterations,
    activeSupportsCount,
    candidateSupportsCount,
    warnings: allWarnings,
  };

  return {
    section,
    yieldStrength,
    allowableStress,
    q: q_Nmm,
    maxStress,
    isSafe,
    numSupports,
    spanLength,
    governingSpan: 0,
    stressData,
    deflectionData,
    supportPositions,
    calcMode,
    computedLmin,
    computedLmax,
    computedH,
    supportStatus,
    activeSupports,
    debug,
  };
};
