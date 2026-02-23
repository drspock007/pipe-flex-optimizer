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
  targetSupports: number;
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
  // Weight per meter: density(kg/m³) × A(mm²→m²) = kg/m
  const weightPerMeter = density * A * 1e-6;
  return { Di, A, I, c, weightPerMeter };
};

// ────────────────────────────────────────────
// Self-weight linear load in N/mm
// ────────────────────────────────────────────
function computeLinearWeight(
  density: number,
  g: number,
  A_mm2: number
): number {
  // Step 1: q in N/m = density(kg/m³) × g(m/s²) × A(m²)
  const A_m2 = A_mm2 * 1e-6;
  const q_N_per_m = density * g * A_m2; // N/m
  // Step 2: convert to N/mm
  return q_N_per_m / 1000; // N/mm
}

// ────────────────────────────────────────────
// Stress for a single fixed-fixed span
//
// M_max occurs at supports (x=0 or x=L):
//   M_self_support = q·L²/12        (fixed-end moment from UDL)
//   M_settle       = 6·E·I·h_span/L²  (settlement-induced moment)
//   M_total        = M_self + M_settle
//   σ              = M_total · c / I
// ────────────────────────────────────────────
function computeStressForSpan(
  q: number,       // N/mm
  E: number,       // MPa
  I: number,       // mm⁴
  c: number,       // mm
  span_mm: number, // mm
  h_span: number   // mm — settlement per span
): number {
  const M_self = (q * span_mm * span_mm) / 12;              // N·mm
  const M_settlement = (6 * E * I * h_span) / (span_mm * span_mm); // N·mm
  const M_max = M_self + M_settlement;
  return (M_max * c) / I; // MPa
}

// ────────────────────────────────────────────
// ANALYTICAL SOLVER — Find maximum span (findL mode)
//
// σ = (M_max · c) / I  ≤  allowable
// M_allowable = allowable · I / c
//
// M = (q/12)·s² + 6·E·I·h_span / s²
//
// Let X = s²:
//   (q/12)·X + 6·E·I·h_span / X = M_allowable
//   (q/12)·X² − M_allowable·X + 6·E·I·h_span = 0
//
// Quadratic: a·X² + b·X + c_coeff = 0
//   a = q / 12
//   b = −M_allowable
//   c_coeff = 6·E·I·h_span
//
// Take the LARGER positive root → longest feasible span.
// ────────────────────────────────────────────
function calculateMaxL(
  inputs: PipeInputs,
  section: SectionProperties,
  q: number,       // N/mm
  E_mpa: number,   // MPa
  allowableStress: number // MPa
): number | undefined {
  const numSpans = inputs.targetSupports + 1;
  const h_span = inputs.h / numSpans; // mm per span

  const M_allowable = (allowableStress * section.I) / section.c; // N·mm

  const a = q / 12;
  const b = -M_allowable;
  const c_coeff = 6 * E_mpa * section.I * h_span;

  // Handle edge case: no self-weight (a ≈ 0) → linear equation
  if (a < 1e-30) {
    if (h_span <= 0) return undefined; // no settlement, no weight → infinite
    // 6EIh/s² = M_allowable → s² = 6EIh / M_allowable
    const s2 = c_coeff / M_allowable;
    if (s2 <= 0) return undefined;
    const s_mm = Math.sqrt(s2);
    return (s_mm * numSpans) / 1000; // total L in meters
  }

  const discriminant = b * b - 4 * a * c_coeff;

  // Negative discriminant → no feasible span exists
  if (discriminant < 0) return undefined;

  const sqrtD = Math.sqrt(discriminant);
  // Larger root of X = s²
  const X = (-b + sqrtD) / (2 * a);

  if (X <= 0) return undefined;

  const s_mm = Math.sqrt(X); // max span in mm
  const L_m = (s_mm * numSpans) / 1000; // total length in m
  return L_m;
}

// ────────────────────────────────────────────
// Find maximum settlement (findH mode)
//
// M_settle = M_allowable − M_self
// 6·E·I·h_span / s² = M_available
// h_span = M_available · s² / (6·E·I)
// total_h = h_span × numSpans
// ────────────────────────────────────────────
function calculateMaxH(
  inputs: PipeInputs,
  section: SectionProperties,
  q: number,       // N/mm
  E_mpa: number,   // MPa
  allowableStress: number // MPa
): number {
  const numSpans = inputs.targetSupports + 1;
  const L_mm = inputs.L * 1000;
  const span_mm = L_mm / numSpans;

  const M_self = (q * span_mm * span_mm) / 12;             // N·mm
  const M_allowable = (allowableStress * section.I) / section.c; // N·mm
  const M_available = M_allowable - M_self;

  if (M_available <= 0) return 0;

  const h_span = (M_available * span_mm * span_mm) / (6 * E_mpa * section.I); // mm
  return h_span * numSpans; // total settlement in mm
}

// ────────────────────────────────────────────
// TRUE STRESS DISTRIBUTION — for chart
//
// For local coordinate x in span [0, L]:
//   M_self(x)   = q · (L·x/2 − x²/2 − L²/12)
//   M_settle(x) = (6·E·I·h_span / L²) · (1 − 2·x/L)
//   M_total     = M_self + M_settle
//   σ           = |M_total| · c / I
// ────────────────────────────────────────────
function generateStressDistribution(
  q: number,       // N/mm
  E: number,       // MPa
  I: number,       // mm⁴
  c: number,       // mm
  L_mm: number,    // mm — total pipe length
  h_mm: number,    // mm — total settlement
  numSupports: number
): { x: number; stress: number }[] {
  const data: { x: number; stress: number }[] = [];
  const numSpans = numSupports + 1;
  const spanLen = L_mm / numSpans;   // mm
  const h_span = h_mm / numSpans;    // mm per span
  const points = 200;

  for (let i = 0; i <= points; i++) {
    const x_mm = (i / points) * L_mm;          // position along pipe in mm
    const x_m = x_mm / 1000;                   // position in m (for chart axis)

    // Which span are we in?
    const spanIndex = Math.min(Math.floor(x_mm / spanLen), numSpans - 1);
    const x_local = x_mm - spanIndex * spanLen; // local position within span, mm

    // Self-weight moment: fixed-fixed beam under UDL
    // M_self(x) = q · (L·x/2 − x²/2 − L²/12)
    const M_self =
      q * (spanLen * x_local / 2 - (x_local * x_local) / 2 - (spanLen * spanLen) / 12);

    // Settlement moment: linear variation across span
    // M_settle(x) = (6EIh/L²) · (1 − 2x/L)
    const M_settle =
      ((6 * E * I * h_span) / (spanLen * spanLen)) * (1 - (2 * x_local) / spanLen);

    const M_total = M_self + M_settle;
    const stress = (Math.abs(M_total) * c) / I; // MPa

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
  const {
    Do, t, grade, customYield, E,
    allowablePercent, includeSelfWeight, density,
    calcMode, targetSupports,
  } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);

  // Allowable = percentage of yield (NOT divided by safety factor)
  const allowableStress = yieldStrength * (allowablePercent / 100); // MPa

  const E_mpa = E * 1000; // GPa → MPa
  const g = 9.81;

  // Self-weight in N/mm — unit-consistent
  const q = includeSelfWeight ? computeLinearWeight(density, g, section.A) : 0;

  let L = inputs.L;
  let h = inputs.h;
  let computedL: number | undefined;
  let computedH: number | undefined;

  if (calcMode === "findL") {
    computedL = calculateMaxL(inputs, section, q, E_mpa, allowableStress);
    L = computedL ?? inputs.L;
  } else if (calcMode === "findH") {
    computedH = calculateMaxH(inputs, section, q, E_mpa, allowableStress);
    h = computedH ?? inputs.h;
  }

  const L_mm = L * 1000;
  const h_mm = h;

  // ── Support optimization (standard mode) ──
  // Start with 0 supports, add until stress ≤ allowable or max 100
  let numSupports = calcMode !== "standard" ? targetSupports : 0;
  let maxStress = Infinity;
  let spanLength = L;
  let governingSpan = 0;

  if (calcMode === "standard") {
    for (let supports = 0; supports <= 100; supports++) {
      const numSpans = supports + 1;
      const span_mm = L_mm / numSpans;
      const h_span = h_mm / numSpans;
      const stress = computeStressForSpan(q, E_mpa, section.I, section.c, span_mm, h_span);

      maxStress = stress;
      numSupports = supports;
      spanLength = L / numSpans;
      governingSpan = supports;

      if (stress <= allowableStress) break;
    }
  } else {
    const numSpans = targetSupports + 1;
    const span_mm = L_mm / numSpans;
    const h_span = h_mm / numSpans;
    maxStress = computeStressForSpan(q, E_mpa, section.I, section.c, span_mm, h_span);
    spanLength = L / numSpans;
    governingSpan = 0;
  }

  const isSafe = maxStress <= allowableStress;

  // ── Stress distribution for chart ──
  const stressData = generateStressDistribution(
    q, E_mpa, section.I, section.c, L_mm, h_mm, numSupports
  );

  // ── Support positions ──
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
