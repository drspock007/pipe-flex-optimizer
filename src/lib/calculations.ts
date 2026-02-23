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
  targetSupports: number; // kept for compatibility, ignored in findL/findH
}

export interface SectionProperties {
  Di: number;           // mm
  A: number;            // mm²
  I: number;            // mm⁴
  c: number;            // mm
  weightPerMeter: number; // kg/m
}

export interface CalculationResults {
  section: SectionProperties;
  yieldStrength: number;     // MPa
  allowableStress: number;   // MPa
  q: number;                 // N/mm (linear weight)
  maxStress: number;         // MPa
  isSafe: boolean;
  numSupports: number;
  spanLength: number;        // m
  governingSpan: number;
  stressData: { x: number; stress: number }[];
  supportPositions: number[];
  calcMode: CalcMode;
  computedL?: number;        // m  — findL result, undefined = no solution
  computedH?: number;        // mm — findH result, undefined = no solution
}

// ────────────────────────────────────────────
// Material grades — yield strength in MPa
// ────────────────────────────────────────────
const GRADES: Record<string, number> = {
  "API 5L X52": 359,
  "API 5L X60": 415,
  "API 5L X65": 450,
  "API 5L X70": 485,
};

export const getGradeOptions = () => [...Object.keys(GRADES), "Custom"];

export const getYieldStrength = (grade: string, customYield: number): number =>
  GRADES[grade] ?? customYield;

// ────────────────────────────────────────────
// Section properties (all mm-based)
// ────────────────────────────────────────────
export const calcSectionProperties = (
  Do: number,
  t: number,
  density: number
): SectionProperties => {
  const Di = Do - 2 * t;
  const A = (Math.PI / 4) * (Do * Do - Di * Di);                   // mm²
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));  // mm⁴
  const c = Do / 2;                                                  // mm
  const weightPerMeter = density * A * 1e-6;                         // kg/m
  return { Di, A, I, c, weightPerMeter };
};

// ────────────────────────────────────────────
// Self-weight linear load in N/mm
// q = density(kg/m³) × g(m/s²) × A(m²) / 1000
// ────────────────────────────────────────────
function computeLinearWeight(density: number, g: number, A_mm2: number): number {
  const A_m2 = A_mm2 * 1e-6;
  const q_N_per_m = density * g * A_m2; // N/m
  return q_N_per_m / 1000;              // N/mm
}

// ────────────────────────────────────────────
// Stress for a single fixed-fixed span
// M_max = q·s²/12 + 6·E·I·h_span/s²
// σ = M_max · c / I
// ────────────────────────────────────────────
function computeStressForSpan(
  q: number, E: number, I: number, c: number,
  span_mm: number, h_span: number
): number {
  const M_self = (q * span_mm * span_mm) / 12;
  const M_settlement = (6 * E * I * h_span) / (span_mm * span_mm);
  const M_max = M_self + M_settlement;
  return (M_max * c) / I;
}

// ────────────────────────────────────────────
// Quadratic solver for max span (single iteration)
// Solves: (q/12)·X² − M_allow·X + 6·E·I·h_span = 0
// where X = s²
// Returns span in mm or undefined if no solution
// ────────────────────────────────────────────
function solveMaxSpanQuadratic(
  q: number, E_mpa: number, I: number, c: number,
  allowableStress: number, h_span: number
): number | undefined {
  const M_allowable = (allowableStress * I) / c; // N·mm
  const a = q / 12;
  const b = -M_allowable;
  const c_coeff = 6 * E_mpa * I * h_span;

  // Edge case: no self-weight → linear equation
  if (a < 1e-30) {
    if (h_span <= 0) return undefined;
    const s2 = c_coeff / M_allowable;
    return s2 > 0 ? Math.sqrt(s2) : undefined;
  }

  const discriminant = b * b - 4 * a * c_coeff;
  if (discriminant < 0) return undefined;

  const sqrtD = Math.sqrt(discriminant);
  const X = (-b + sqrtD) / (2 * a); // larger root = s²
  if (X <= 0) return undefined;

  return Math.sqrt(X); // span in mm
}

// ────────────────────────────────────────────
// Find max L — iterates supports from 0 to 100
// Returns { L_m, numSupports } or undefined
// ────────────────────────────────────────────
function calculateMaxL(
  h_total: number, q: number, E_mpa: number,
  I: number, c: number, allowableStress: number
): { L_m: number; numSupports: number } | undefined {
  for (let supports = 0; supports <= 100; supports++) {
    const numSpans = supports + 1;
    const h_span = h_total / numSpans; // mm per span

    const span_mm = solveMaxSpanQuadratic(q, E_mpa, I, c, allowableStress, h_span);
    if (span_mm !== undefined && span_mm > 0) {
      const L_m = (span_mm * numSpans) / 1000; // total length in m
      return { L_m, numSupports: supports };
    }
  }
  return undefined;
}

// ────────────────────────────────────────────
// Find max H — iterates supports from 0 to 100
// M_available = M_allowable − M_self
// h_span = M_available · s² / (6·E·I)
// total_h = h_span × numSpans
// ────────────────────────────────────────────
function calculateMaxH(
  L_m: number, q: number, E_mpa: number,
  I: number, c: number, allowableStress: number
): { h_mm: number; numSupports: number } | undefined {
  const L_mm = L_m * 1000;
  const M_allowable = (allowableStress * I) / c;

  for (let supports = 0; supports <= 100; supports++) {
    const numSpans = supports + 1;
    const span_mm = L_mm / numSpans;

    const M_self = (q * span_mm * span_mm) / 12;
    const M_available = M_allowable - M_self;

    if (M_available > 0) {
      const h_span = (M_available * span_mm * span_mm) / (6 * E_mpa * I);
      const total_h = h_span * numSpans;
      return { h_mm: total_h, numSupports: supports };
    }
  }
  return undefined;
}

// ────────────────────────────────────────────
// True stress distribution for chart
// M_self(x) = q·(s·x/2 − x²/2 − s²/12)
// M_settle(x) = (6EIh/s²)·(1 − 2x/s)
// σ = |M_total| · c / I
// ────────────────────────────────────────────
function generateStressDistribution(
  q: number, E: number, I: number, c: number,
  L_mm: number, h_mm: number, numSupports: number
): { x: number; stress: number }[] {
  const data: { x: number; stress: number }[] = [];
  const numSpans = numSupports + 1;
  const spanLen = L_mm / numSpans;
  const h_span = h_mm / numSpans;
  const points = 200;

  for (let i = 0; i <= points; i++) {
    const x_mm = (i / points) * L_mm;
    const x_m = x_mm / 1000;

    const spanIndex = Math.min(Math.floor(x_mm / spanLen), numSpans - 1);
    const x_local = x_mm - spanIndex * spanLen;

    const M_self = q * (spanLen * x_local / 2 - (x_local * x_local) / 2 - (spanLen * spanLen) / 12);
    const M_settle = ((6 * E * I * h_span) / (spanLen * spanLen)) * (1 - (2 * x_local) / spanLen);
    const M_total = M_self + M_settle;
    const stress = (Math.abs(M_total) * c) / I;

    data.push({
      x: Math.round(x_m * 1000) / 1000,
      stress: Math.round(stress * 100) / 100,
    });
  }
  return data;
}

// ────────────────────────────────────────────
// MAIN CALCULATION ENTRY POINT
// ────────────────────────────────────────────
export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent, includeSelfWeight, density, calcMode } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100); // MPa
  const E_mpa = E * 1000; // GPa → MPa
  const q = includeSelfWeight ? computeLinearWeight(density, 9.81, section.A) : 0;

  let L = inputs.L;
  let h = inputs.h;
  let computedL: number | undefined;
  let computedH: number | undefined;
  let numSupports = 0;
  let maxStress = Infinity;
  let spanLength = L;
  let governingSpan = 0;

  if (calcMode === "findL") {
    // Auto-iterate supports to find max feasible L
    const result = calculateMaxL(inputs.h, q, E_mpa, section.I, section.c, allowableStress);
    if (result) {
      computedL = result.L_m;
      numSupports = result.numSupports;
      L = result.L_m;
    } else {
      computedL = undefined;
    }
  } else if (calcMode === "findH") {
    // Auto-iterate supports to find max feasible h
    const result = calculateMaxH(inputs.L, q, E_mpa, section.I, section.c, allowableStress);
    if (result) {
      computedH = result.h_mm;
      numSupports = result.numSupports;
      h = result.h_mm;
    } else {
      computedH = undefined;
    }
  }

  const L_mm = L * 1000;
  const h_mm = h;

  // Standard mode: auto-optimize supports
  if (calcMode === "standard") {
    for (let supports = 0; supports <= 100; supports++) {
      const nSpans = supports + 1;
      const span_mm = L_mm / nSpans;
      const h_span = h_mm / nSpans;
      const stress = computeStressForSpan(q, E_mpa, section.I, section.c, span_mm, h_span);

      maxStress = stress;
      numSupports = supports;
      spanLength = L / nSpans;
      governingSpan = supports;

      if (stress <= allowableStress) break;
    }
  } else {
    // findL / findH: compute stress for the found configuration
    const nSpans = numSupports + 1;
    const span_mm = L_mm / nSpans;
    const h_span = h_mm / nSpans;
    maxStress = computeStressForSpan(q, E_mpa, section.I, section.c, span_mm, h_span);
    spanLength = L / nSpans;
  }

  const isSafe = maxStress <= allowableStress;

  const stressData = generateStressDistribution(q, E_mpa, section.I, section.c, L_mm, h_mm, numSupports);

  const supportPositions: number[] = [];
  if (numSupports > 0) {
    const spanM = L / (numSupports + 1);
    for (let i = 1; i <= numSupports; i++) {
      supportPositions.push(i * spanM);
    }
  }

  return {
    section, yieldStrength, allowableStress, q, maxStress, isSafe,
    numSupports, spanLength, governingSpan, stressData, supportPositions,
    calcMode, computedL, computedH,
  };
};
