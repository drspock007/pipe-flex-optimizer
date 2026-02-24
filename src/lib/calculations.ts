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
  targetSupports: number; // legacy, ignored in findL/findH
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
  q: number;                 // N/mm
  maxStress: number;         // MPa
  isSafe: boolean;
  numSupports: number;
  spanLength: number;        // m
  governingSpan: number;
  stressData: { x: number; stress: number }[];
  supportPositions: number[];
  calcMode: CalcMode;
  computedL?: number;        // m
  computedH?: number;        // mm
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
// B) SECTION PROPERTIES  (all mm-based)
// ══════════════════════════════════════════════
export const calcSectionProperties = (
  Do: number, t: number, density: number
): SectionProperties => {
  const Di = Do - 2 * t;
  console.assert(Di > 0, `[CALC] Di must be > 0, got ${Di}`);
  const A  = (Math.PI / 4)  * (Do * Do - Di * Di);                    // mm²
  const I  = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));    // mm⁴
  const c  = Do / 2;                                                    // mm
  const weightPerMeter = density * A * 1e-6;                            // kg/m
  return { Di, A, I, c, weightPerMeter };
};

// ══════════════════════════════════════════════
// Self-weight  q in N/mm
//   q_N_per_m  = density(kg/m³) × g(m/s²) × A(m²)   → N/m
//   q_N_per_mm = q_N_per_m / 1000                     → N/mm
// ══════════════════════════════════════════════
function computeQ(density: number, g: number, A_mm2: number): number {
  const A_m2 = A_mm2 * 1e-6;
  const q_N_per_m  = density * g * A_m2;
  const q_N_per_mm = q_N_per_m / 1000;
  console.log(`[CALC] q_N_per_m = ${q_N_per_m.toFixed(4)} N/m`);
  console.log(`[CALC] q_N_per_mm = ${q_N_per_mm.toFixed(6)} N/mm`);
  return q_N_per_mm;
}

// ══════════════════════════════════════════════
// D1) GOVERNING END MOMENT  (fixed-fixed span)
//
//   M_q_end = q·Ls² / 12          (UDL fixed-end moment)
//   M_h_end = 6·E·I·hs / Ls²     (settlement moment)
//   M_end_max = M_q_end + M_h_end
//   σ_max   = M_end_max · c / I
// ══════════════════════════════════════════════
function sigmaMax(
  q: number, E: number, I: number, c: number,
  Ls: number, hs: number
): number {
  const M_q = (q * Ls * Ls) / 12;
  const M_h = (6 * E * I * hs) / (Ls * Ls);
  return ((M_q + M_h) * c) / I;
}

// ══════════════════════════════════════════════
// E) AUTO-ADD SUPPORTS  (standard mode)
// ══════════════════════════════════════════════
function autoSupports(
  q: number, E: number, I: number, c: number,
  L_mm: number, h_mm: number, allowable: number
): { numSupports: number; stress: number } {
  // Note: M_h = 6EI·h·Nsp/L² grows with Nsp while M_q = qL²/(12Nsp²) shrinks.
  // There is an optimal Nsp that minimizes total stress.
  // We iterate, track the minimum, and stop when stress starts rising again.
  let bestN = 0;
  let bestStress = Infinity;

  for (let n = 0; n <= 100; n++) {
    const Nsp = n + 1;
    const Ls  = L_mm / Nsp;
    const hs  = h_mm / Nsp;
    const s   = sigmaMax(q, E, I, c, Ls, hs);

    if (s <= allowable) return { numSupports: n, stress: s };

    if (s < bestStress) {
      bestStress = s;
      bestN = n;
    } else {
      // Stress is rising — past the optimum, stop searching
      break;
    }
  }
  // No safe config found; return the best (lowest stress) one
  return { numSupports: bestN, stress: bestStress };
}

// ══════════════════════════════════════════════
// F1) FIND H  — iterate supports 0→100
//
//   M_allow = allowable · I / c
//   M_margin = M_allow − q·Ls²/12
//   hs_max  = M_margin · Ls² / (6·E·I)
//   h_total = hs_max × Nsp
// ══════════════════════════════════════════════
function findMaxH(
  q: number, E: number, I: number, c: number,
  L_mm: number, allowable: number
): { h_mm: number; numSupports: number } | undefined {
  const M_allow = (allowable * I) / c;
  for (let n = 0; n <= 100; n++) {
    const Nsp = n + 1;
    const Ls  = L_mm / Nsp;
    const M_q = (q * Ls * Ls) / 12;
    const M_margin = M_allow - M_q;
    if (M_margin > 0) {
      const hs_max = (M_margin * Ls * Ls) / (6 * E * I);
      const h_total = hs_max * Nsp;
      console.log(`[CALC findH] n=${n} Ls=${Ls.toFixed(1)} M_q=${M_q.toExponential(4)} M_margin=${M_margin.toExponential(4)} hs_max=${hs_max.toFixed(2)} h_total=${h_total.toFixed(2)}`);
      return { h_mm: h_total, numSupports: n };
    }
  }
  return undefined;
}

// ══════════════════════════════════════════════
// F2) FIND L  — iterate supports 0→100
//
//   Quadratic in X = Ls²:
//     a = q/12
//     b = −M_allow
//     c_coeff = 6·E·I·hs
//   Discriminant D = b² − 4ac
//   Ls_max = √(X2)  where X2 = (−b + √D)/(2a)
//   L_total = Ls_max × Nsp / 1000   (m)
// ══════════════════════════════════════════════
function findMaxL(
  q: number, E: number, I: number, c: number,
  h_mm: number, allowable: number
): { L_m: number; numSupports: number } | undefined {
  const M_allow = (allowable * I) / c;

  for (let n = 0; n <= 100; n++) {
    const Nsp = n + 1;
    const hs  = h_mm / Nsp;

    const a = q / 12;
    const b = -M_allow;
    const cc = 6 * E * I * hs;

    // Edge: no self-weight (a ≈ 0) → linear: M_allow·X = 6EIhs → X = cc/M_allow
    if (a < 1e-30) {
      if (hs <= 0) continue;
      const X = cc / M_allow;
      if (X <= 0) continue;
      const Ls = Math.sqrt(X);
      const L_m = (Ls * Nsp) / 1000;
      // verify
      const sv = sigmaMax(0, E, I, c, Ls, hs);
      console.log(`[CALC findL] n=${n} (no q) Ls=${Ls.toFixed(1)} σ_verify=${sv.toFixed(2)}`);
      return { L_m, numSupports: n };
    }

    const D = b * b - 4 * a * cc;
    console.log(`[CALC findL] n=${n} hs=${hs.toFixed(2)} a=${a.toExponential(4)} cc=${cc.toExponential(4)} D=${D.toExponential(4)}`);

    if (D < 0) continue; // no feasible span at this support count

    const sqrtD = Math.sqrt(D);
    const X2 = (-b + sqrtD) / (2 * a); // larger root

    if (X2 <= 0) continue;

    const Ls = Math.sqrt(X2);
    const L_m = (Ls * Nsp) / 1000;

    // Self-check: verify stress at found span
    const sv = sigmaMax(q, E, I, c, Ls, hs);
    console.log(`[CALC findL] n=${n} Ls=${Ls.toFixed(1)} L_total=${L_m.toFixed(2)} σ_verify=${sv.toFixed(2)} allowable=${allowable.toFixed(2)}`);

    return { L_m, numSupports: n };
  }
  return undefined;
}

// ══════════════════════════════════════════════
// G) STRESS DISTRIBUTION FOR GRAPH
//
//   M_q(x) = −q·Ls²/12 + q·Ls·x/2 − q·x²/2
//   M_h(x) = (6EI·hs/Ls²) · (1 − 2x/Ls)
//   σ(x)   = |M_q(x) + M_h(x)| · c / I
// ══════════════════════════════════════════════
function stressDistribution(
  q: number, E: number, I: number, c: number,
  L_mm: number, h_mm: number, numSupports: number
): { x: number; stress: number }[] {
  const data: { x: number; stress: number }[] = [];
  const Nsp = numSupports + 1;
  const Ls  = L_mm / Nsp;
  const hs  = h_mm / Nsp;
  const pts = 200;

  for (let i = 0; i <= pts; i++) {
    const x_mm = (i / pts) * L_mm;
    const spanIdx = Math.min(Math.floor(x_mm / Ls), Nsp - 1);
    const xl = x_mm - spanIdx * Ls; // local x within span

    const M_q = -q * Ls * Ls / 12 + q * Ls * xl / 2 - q * xl * xl / 2;
    const M_h = (6 * E * I * hs / (Ls * Ls)) * (1 - 2 * xl / Ls);
    const stress = (Math.abs(M_q + M_h) * c) / I;

    data.push({
      x: Math.round((x_mm / 1000) * 1000) / 1000,
      stress: Math.round(stress * 100) / 100,
    });
  }
  return data;
}

// ══════════════════════════════════════════════
// MAIN ENTRY POINT
// ══════════════════════════════════════════════
export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent,
          includeSelfWeight, density, calcMode } = inputs;

  // B) Section
  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);

  // C) Allowable
  const allowableStress = yieldStrength * (allowablePercent / 100);

  // Unit conversions
  const E_mpa = E * 1000;  // GPa → MPa
  const q = includeSelfWeight ? computeQ(density, 9.81, section.A) : 0;

  let L = inputs.L;        // m
  let h = inputs.h;        // mm
  let computedL: number | undefined;
  let computedH: number | undefined;
  let numSupports = 0;
  let maxStress = Infinity;

  // ── Mode dispatch ──
  if (calcMode === "findL") {
    const r = findMaxL(q, E_mpa, section.I, section.c, h, allowableStress);
    if (r) {
      computedL = r.L_m;
      numSupports = r.numSupports;
      L = r.L_m;
    } else {
      computedL = undefined;
    }
  } else if (calcMode === "findH") {
    const r = findMaxH(q, E_mpa, section.I, section.c, inputs.L * 1000, allowableStress);
    if (r) {
      computedH = r.h_mm;
      numSupports = r.numSupports;
      h = r.h_mm;
    } else {
      computedH = undefined;
    }
  }

  const L_mm = L * 1000;
  const h_mm = h;

  // E) Standard auto-support
  if (calcMode === "standard") {
    const r = autoSupports(q, E_mpa, section.I, section.c, L_mm, h_mm, allowableStress);
    numSupports = r.numSupports;
    maxStress = r.stress;
  } else {
    // Verify stress for findL/findH result
    const Nsp = numSupports + 1;
    const Ls  = L_mm / Nsp;
    const hs  = h_mm / Nsp;
    maxStress = sigmaMax(q, E_mpa, section.I, section.c, Ls, hs);
  }

  // H) Self-check log
  const Nsp = numSupports + 1;
  const Ls  = L_mm / Nsp;
  const hs  = h_mm / Nsp;
  const M_q = (q * Ls * Ls) / 12;
  const M_h = (6 * E_mpa * section.I * hs) / (Ls * Ls);
  console.log(`[CALC VERIFY] mode=${calcMode} supports=${numSupports} Ls=${Ls.toFixed(1)}mm hs=${hs.toFixed(2)}mm`);
  console.log(`[CALC VERIFY] M_q_end=${M_q.toExponential(4)} M_h_end=${M_h.toExponential(4)} M_total=${(M_q+M_h).toExponential(4)}`);
  console.log(`[CALC VERIFY] σ_max=${maxStress.toFixed(2)} MPa  allowable=${allowableStress.toFixed(2)} MPa  safe=${maxStress <= allowableStress}`);

  const isSafe = maxStress <= allowableStress;
  const spanLength = L / Nsp;

  // G) Stress distribution
  const stressData = stressDistribution(q, E_mpa, section.I, section.c, L_mm, h_mm, numSupports);

  // Support positions
  const supportPositions: number[] = [];
  if (numSupports > 0) {
    const spanM = L / Nsp;
    for (let i = 1; i <= numSupports; i++) supportPositions.push(i * spanM);
  }

  return {
    section, yieldStrength, allowableStress, q, maxStress, isSafe,
    numSupports, spanLength, governingSpan: 0, stressData, supportPositions,
    calcMode, computedL, computedH,
  };
};
