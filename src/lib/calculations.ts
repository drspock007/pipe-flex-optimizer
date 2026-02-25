// src/lib/calculations.ts
// Modifié par Giovanni Malagnino, 2026-02-25 16:46 UTC.

export type CalcMode = "standard" | "findL" | "findH";
export type FindLDisplayMode = "Lmin" | "Lmid" | "Lopt" | "Lmax";

export interface PipeInputs {
  Do: number; // mm
  t: number; // mm
  L: number; // m
  h: number; // mm (user convention: positive upward = right end higher)
  grade: string;
  customYield: number; // MPa
  E: number; // GPa
  allowablePercent: number; // %
  includeSelfWeight: boolean;
  density: number; // kg/m³
  calcMode: CalcMode;
  targetSupports: number; // legacy
  findLDisplay: FindLDisplayMode; // NEW: which point to display in FindL
}

export interface SectionProperties {
  Di: number; // mm
  A: number; // mm²
  I: number; // mm⁴
  c: number; // mm
  weightPerMeter: number; // kg/m
}

export interface SupportStatusDisplay {
  x: number; // m
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

  searchSupportsUsed?: number;
  searchLminGuess?: number;
  searchLmaxGuess?: number;

  contactIterations?: number;
  activeSupportsCount?: number;
  candidateSupportsCount?: number;

  h_up_mm?: number;
  h_fem_mm?: number;

  L_plot?: number;
  stressAtLmin?: number;
  stressAtLmax?: number;
  stressAtLplot?: number;
  contactValid?: boolean;

  warnings: string[];
}

export interface CalculationResults {
  section: SectionProperties;
  yieldStrength: number;
  allowableStress: number;
  q: number; // N/mm
  maxStress: number;
  isSafe: boolean;

  hasWindow: boolean;
  isSafeNow: boolean;

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

  supportStatus: SupportStatusDisplay[];
  activeSupports: number[];

  h_up_mm: number;

  // NEW: FindL selector info
  findLDisplay: FindLDisplayMode;
  findLPoints?: { Lmin: number; Lmid: number; Lopt: number; Lmax: number };
  L_plot?: number;

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

// ── Section properties (mm-based) ──
export const calcSectionProperties = (Do: number, t: number, density: number): SectionProperties => {
  const Di = Do - 2 * t;
  const A = (Math.PI / 4) * (Do * Do - Di * Di);
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const c = Do / 2;
  const weightPerMeter = density * A * 1e-6; // kg/m
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

// ── FEM imports ──
import { solveFEM, autoSupportsFEM, findLRangeFEM, findMaxHFEM, buildEqualSupports } from "./fem-solver";

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent, includeSelfWeight, density, calcMode } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);

  const E_mpa = E * 1000;
  const { q_Nmm, q_Nm } = includeSelfWeight ? computeQ(density, 9.81, section.A) : { q_Nmm: 0, q_Nm: 0 };

  // User: h_up positive (right end higher). FEM: w positive downward => h_fem = -h_up.
  const h_up_mm = inputs.h;
  const h_fem = -h_up_mm;

  let L = inputs.L;
  let h = h_fem;

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
  let contactIterations: number | undefined;
  let activeSupportsCount: number | undefined;
  let candidateSupportsCount: number | undefined;

  let searchSupportsUsed: number | undefined;
  let searchLminGuess: number | undefined;
  let searchLmaxGuess: number | undefined;

  let supportStatus: SupportStatusDisplay[] = [];
  let activeSupports: number[] = [];

  let L_plot: number | undefined;
  let stressAtLmin: number | undefined;
  let stressAtLmax: number | undefined;
  let stressAtLplot: number | undefined;
  let contactValid: boolean | undefined;

  let findLPoints: { Lmin: number; Lmid: number; Lopt: number; Lmax: number } | undefined;

  const unitWarnings: string[] = [];
  assertUnits(E_mpa, section.I, q_Nmm, L * 1000, unitWarnings);

  // ─────────────────────────────────────────────
  // FIND L
  // ─────────────────────────────────────────────
  if (calcMode === "findL") {
    const r = findLRangeFEM(E_mpa, section.I, section.c, q_Nmm, h_fem, allowableStress);
    if (r) {
      computedLmin = r.Lmin;
      computedLmax = r.Lmax;
      numSupports = r.numSupports;

      findLPoints = { Lmin: r.Lmin, Lmid: r.Lmid, Lopt: r.Lopt, Lmax: r.Lmax };

      searchSupportsUsed = r.numSupports;
      searchLminGuess = r.searchLminGuess;
      searchLmaxGuess = r.searchLmaxGuess;

      stressAtLmin = r.stressAtLmin;
      stressAtLmax = r.stressAtLmax;

      const mode = inputs.findLDisplay ?? "Lmid";

      // Choose which point to DISPLAY (and thus which FEM result to publish)
      let chosenL = r.Lmid;
      let chosenStress = r.stressAtLmid;
      let chosen = r.resultAtLmid;

      if (mode === "Lmin") {
        chosenL = r.Lmin;
        chosenStress = r.stressAtLmin;
        chosen = r.resultAtLmin;
      } else if (mode === "Lmid") {
        chosenL = r.Lmid;
        chosenStress = r.stressAtLmid;
        chosen = r.resultAtLmid;
      } else if (mode === "Lopt") {
        chosenL = r.Lopt;
        chosenStress = r.stressAtLopt;
        chosen = r.resultAtLopt;
      } else if (mode === "Lmax") {
        chosenL = r.Lmax;
        chosenStress = r.stressAtLmax;
        chosen = r.resultAtLmax;
      }

      L_plot = chosenL;
      L = chosenL;
      maxStress = chosenStress;

      maxMoment = chosen.maxMoment;
      maxMomentLocation = chosen.maxMomentLocation;
      stressData = chosen.stressData;
      deflectionData = chosen.deflectionData;

      elementsPerSpan = chosen.meshInfo.elementsPerSpan;
      totalDofs = chosen.meshInfo.totalDofs;
      solveTimeMs = chosen.meshInfo.solveTimeMs;
      femWarnings = chosen.warnings;

      contactIterations = chosen.contactIterations;
      activeSupports = chosen.activeSupports;
      activeSupportsCount = chosen.activeSupports.length;
      candidateSupportsCount = numSupports;

      stressAtLplot = chosenStress;

      supportStatus = chosen.supportStatus.map((s) => ({
        x: s.x_mm / 1000,
        w_fem: s.w_fem,
        w_ref: s.w_ref,
        active: s.active,
      }));
    }
  }

  // ─────────────────────────────────────────────
  // FIND H
  // ─────────────────────────────────────────────
  if (calcMode === "findH") {
    const L_mm = inputs.L * 1000;
    const r = findMaxHFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, allowableStress);
    if (r) {
      computedH = Math.abs(r.h_mm);
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
  }

  // ─────────────────────────────────────────────
  // STANDARD
  // ─────────────────────────────────────────────
  if (calcMode === "standard") {
    const L_mm = inputs.L * 1000;
    const r = autoSupportsFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, h_fem, allowableStress);

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

  // Candidate supports displayed (equal spacing)
  const L_mm = L * 1000;
  const supports_mm = buildEqualSupports(L_mm, numSupports);
  supportPositions = supports_mm.map((x) => x / 1000);

  // Fallback solve if something returned no curves (should be rare)
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
  const spanLength = L / Nsp;

  const hasWindow = calcMode === "findL" ? computedLmin != null && computedLmax != null : false;
  const isSafeNow = isFinite(maxStress) && maxStress <= allowableStress + 0.5;
  const isSafe = calcMode === "findL" ? hasWindow && isSafeNow : isSafeNow;

  // Theory sanity checks (use abs(h) for theory comparisons)
  const h_abs = Math.abs(h_up_mm);

  const M_end_theory = q_Nmm > 0 ? (q_Nmm * L_mm * L_mm) / 12 : 0;
  const femTheoryRatio = M_end_theory > 0 && numSupports === 0 && h_abs === 0 ? maxMoment / M_end_theory : 0;
  const errorPercent =
    M_end_theory > 0 && numSupports === 0 && h_abs === 0
      ? (Math.abs(maxMoment - M_end_theory) / M_end_theory) * 100
      : 0;

  const Ls_mm = L_mm / Nsp;
  const hs_mm = h_abs / Nsp;
  const M_theory_span = numSupports > 0 && q_Nmm > 0 ? (q_Nmm * Ls_mm * Ls_mm) / 12 : 0;
  const M_settle_span = numSupports > 0 && h_abs > 0 ? (6 * E_mpa * section.I * hs_mm) / (Ls_mm * Ls_mm) : 0;
  const spanTheoryTotal = M_theory_span + M_settle_span;
  const spanErrorPercent =
    numSupports > 0 && spanTheoryTotal > 0 ? (Math.abs(maxMoment - spanTheoryTotal) / spanTheoryTotal) * 100 : 0;

  const M_settlement_theory = h_abs > 0 ? (6 * E_mpa * section.I * h_abs) / (L_mm * L_mm) : 0;
  let M_settlement_fem = 0;
  let settlementErrorPercent = 0;
  if (h_abs > 0) {
    const settlementResult = solveFEM(E_mpa, section.I, section.c, 0, L_mm, h_fem, [], false);
    M_settlement_fem = settlementResult.maxMoment;
    settlementErrorPercent =
      M_settlement_theory > 0 ? (Math.abs(M_settlement_fem - M_settlement_theory) / M_settlement_theory) * 100 : 0;
  }

  if (numSupports === 0 && h_abs === 0 && q_Nmm > 0 && errorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Self-weight FEM/theory error ${errorPercent.toFixed(1)}% > 5%`);
  }
  if (h_abs > 0 && settlementErrorPercent > 5) {
    unitWarnings.push(`⚠️ FAIL: Settlement FEM/theory error ${settlementErrorPercent.toFixed(1)}% > 5%`);
  }

  const validationPassed = !(
    (numSupports === 0 && h_abs === 0 && q_Nmm > 0 && errorPercent > 5) ||
    (h_abs > 0 && settlementErrorPercent > 5)
  );

  const allWarnings = [...unitWarnings, ...femWarnings];
  contactValid = !allWarnings.some((w) => w.startsWith("Contact violation"));

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

    h_up_mm,
    h_fem_mm: h_fem,

    L_plot,
    stressAtLmin,
    stressAtLmax,
    stressAtLplot,
    contactValid,

    warnings: allWarnings,
  };

  return {
    section,
    yieldStrength,
    allowableStress,
    q: q_Nmm,
    maxStress,
    isSafe,

    hasWindow,
    isSafeNow,

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

    h_up_mm,

    findLDisplay: inputs.findLDisplay ?? "Lmid",
    findLPoints,
    L_plot,

    debug,
  };
};
