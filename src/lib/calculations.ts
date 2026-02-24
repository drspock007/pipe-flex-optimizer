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
  I: number;
  c: number;
  maxMoment: number;
  maxMomentLocation: number;  // mm
  maxStress: number;
  allowableStress: number;
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
  console.assert(Di > 0, `[CALC] Di must be > 0, got ${Di}`);
  const A  = (Math.PI / 4)  * (Do * Do - Di * Di);
  const I  = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4));
  const c  = Do / 2;
  const weightPerMeter = density * A * 1e-6;
  return { Di, A, I, c, weightPerMeter };
};

// ══════════════════════════════════════════════
// Self-weight q in N/mm
// ══════════════════════════════════════════════
function computeQ(density: number, g: number, A_mm2: number): { q_Nmm: number; q_Nm: number } {
  const A_m2 = A_mm2 * 1e-6;
  const q_Nm  = density * g * A_m2;
  const q_Nmm = q_Nm / 1000;
  console.log(`[CALC] q = ${q_Nm.toFixed(4)} N/m = ${q_Nmm.toFixed(6)} N/mm`);
  return { q_Nmm, q_Nm };
}

// ══════════════════════════════════════════════
// MAIN ENTRY POINT — now uses FEM solver
// ══════════════════════════════════════════════
import {
  solveFEM, autoSupportsFEM, findMaxLFEM, findMaxHFEM, buildEqualSupports
} from "./fem-solver";

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent,
          includeSelfWeight, density, calcMode } = inputs;

  // Section properties
  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);

  // Unit conversions
  const E_mpa = E * 1000;  // GPa → MPa
  const { q_Nmm, q_Nm } = includeSelfWeight
    ? computeQ(density, 9.81, section.A)
    : { q_Nmm: 0, q_Nm: 0 };

  let L = inputs.L;        // m
  let h = inputs.h;        // mm
  let computedL: number | undefined;
  let computedH: number | undefined;
  let numSupports = 0;
  let maxStress = Infinity;
  let maxMoment = 0;
  let maxMomentLocation = 0;
  let stressData: { x: number; stress: number }[] = [];
  let supportPositions: number[] = [];

  // ── Mode dispatch ──
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
    }
  } else if (calcMode === "findH") {
    const r = findMaxHFEM(E_mpa, section.I, section.c, q_Nmm, inputs.L * 1000, allowableStress);
    if (r) {
      computedH = r.h_mm;
      numSupports = r.numSupports;
      h = r.h_mm;
      maxStress = r.result.maxStress;
      maxMoment = r.result.maxMoment;
      maxMomentLocation = r.result.maxMomentLocation;
      stressData = r.result.stressData;
    }
  } else {
    // Standard mode: auto-add supports
    const L_mm = L * 1000;
    const r = autoSupportsFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, h, allowableStress);
    numSupports = r.numSupports;
    maxStress = r.stress;
    maxMoment = r.result.maxMoment;
    maxMomentLocation = r.result.maxMomentLocation;
    stressData = r.result.stressData;
  }

  // Build support positions for display (in meters)
  const L_mm = L * 1000;
  const supports_mm = buildEqualSupports(L_mm, numSupports);
  supportPositions = supports_mm.map(x => x / 1000);

  // If stressData is empty (findL/findH returned no result), run FEM once with current params
  if (stressData.length === 0) {
    const result = solveFEM(E_mpa, section.I, section.c, q_Nmm, L_mm, h, supports_mm);
    maxStress = result.maxStress;
    maxMoment = result.maxMoment;
    maxMomentLocation = result.maxMomentLocation;
    stressData = result.stressData;
  }

  const Nsp = numSupports + 1;
  const isSafe = maxStress <= allowableStress;
  const spanLength = L / Nsp;

  // Console verification
  console.log(`[FEM VERIFY] mode=${calcMode} supports=${numSupports} σ_max=${maxStress.toFixed(2)} MPa allowable=${allowableStress.toFixed(2)} MPa safe=${isSafe}`);
  console.log(`[FEM VERIFY] maxMoment=${maxMoment.toExponential(4)} N·mm at x=${maxMomentLocation.toFixed(1)} mm`);

  const debug: DebugInfo = {
    q_Nmm, q_Nm, I: section.I, c: section.c,
    maxMoment, maxMomentLocation, maxStress, allowableStress,
  };

  return {
    section, yieldStrength, allowableStress, q: q_Nmm, maxStress, isSafe,
    numSupports, spanLength, governingSpan: 0, stressData, supportPositions,
    calcMode, computedL, computedH, debug,
  };
};
