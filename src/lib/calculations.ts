export type CalcMode = "standard" | "findL" | "findH";

export interface PipeInputs {
  Do: number; // mm
  t: number;  // mm
  L: number;  // m
  h: number;  // mm
  grade: string;
  customYield: number; // MPa
  E: number;  // GPa
  allowablePercent: number;
  includeSelfWeight: boolean;
  density: number; // kg/m³
  calcMode: CalcMode;
  targetSupports: number;
}

export interface SectionProperties {
  Di: number;   // mm
  A: number;    // mm²
  I: number;    // mm⁴
  c: number;    // mm
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
  supportPositions: number[]; // m
  computedL?: number;        // m (findL mode)
  computedH?: number;        // mm (findH mode)
}

const GRADES: Record<string, number> = {
  "API 5L X52": 359,
  "API 5L X60": 415,
  "API 5L X65": 450,
  "API 5L X70": 485,
};

export const getGradeOptions = () => [
  ...Object.keys(GRADES),
  "Custom",
];

export const getYieldStrength = (grade: string, customYield: number): number => {
  return GRADES[grade] ?? customYield;
};

export const calcSectionProperties = (Do: number, t: number, density: number): SectionProperties => {
  const Di = Do - 2 * t;
  const A = (Math.PI / 4) * (Do * Do - Di * Di); // mm²
  const I = (Math.PI / 64) * (Math.pow(Do, 4) - Math.pow(Di, 4)); // mm⁴
  const c = Do / 2; // mm
  const weightPerMeter = density * A * 1e-6; // kg/m (A in mm² → m²)
  return { Di, A, I, c, weightPerMeter };
};

function computeStressForSpan(q: number, E_mpa: number, I: number, c: number, span_mm: number, h_span: number): number {
  const M_self = (q * span_mm * span_mm) / 12;
  const M_settlement = (6 * E_mpa * I * h_span) / (span_mm * span_mm);
  const M_max = M_self + M_settlement;
  return (M_max * c) / I;
}

function calculateMaxL(inputs: PipeInputs, section: SectionProperties, q: number, E_mpa: number, allowableStress: number): number {
  const { h, targetSupports } = inputs;
  const h_mm = h;
  const numSpans = targetSupports + 1;

  let lo = 0.1, hi = 1000;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const span_mm = (mid * 1000) / numSpans;
    const h_span = h_mm / numSpans;
    const stress = computeStressForSpan(q, E_mpa, section.I, section.c, span_mm, h_span);
    if (stress <= allowableStress) lo = mid;
    else hi = mid;
  }
  return lo;
}

function calculateMaxH(inputs: PipeInputs, section: SectionProperties, q: number, E_mpa: number, allowableStress: number): number {
  const { L, targetSupports } = inputs;
  const L_mm = L * 1000;
  const numSpans = targetSupports + 1;
  const span_mm = L_mm / numSpans;

  const M_self = (q * span_mm * span_mm) / 12;
  const M_allowable = (allowableStress * section.I) / section.c;
  const M_available = M_allowable - M_self;

  if (M_available <= 0) return 0;

  const h_span = (M_available * span_mm * span_mm) / (6 * E_mpa * section.I);
  return h_span * numSpans;
}

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, grade, customYield, E, allowablePercent, includeSelfWeight, density, calcMode, targetSupports } = inputs;

  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);
  const E_mpa = E * 1000;
  const g = 9.81;
  const q = includeSelfWeight ? density * g * section.A * 1e-6 : 0;

  let L = inputs.L;
  let h = inputs.h;
  let computedL: number | undefined;
  let computedH: number | undefined;

  if (calcMode === "findL") {
    computedL = calculateMaxL(inputs, section, q, E_mpa, allowableStress);
    L = computedL;
  } else if (calcMode === "findH") {
    computedH = calculateMaxH(inputs, section, q, E_mpa, allowableStress);
    h = computedH;
  }

  const L_mm = L * 1000;
  const h_mm = h;

  // Iterative support optimization (standard mode)
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
    computedL, computedH,
  };
};

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
    const x_total = (i / points) * (L_mm / 1000); // in meters
    const x_mm = (i / points) * L_mm;

    // Determine which span
    const spanIndex = Math.min(Math.floor(x_mm / spanLen), numSpans - 1);
    const x_local = x_mm - spanIndex * spanLen;
    const xi = x_local / spanLen; // normalized 0..1

    // Fixed-fixed beam stress distribution
    // M(x) = q*L*x/2 - q*x²/2 - qL²/12 + settlement moment
    // Simplified parabolic shape for fixed-fixed
    const M_self_local = q * spanLen * spanLen * (6 * xi * (1 - xi) - 1) / 12;
    const M_settle_local = 6 * E * I * h_span / (spanLen * spanLen) * (1 - 2 * xi);
    
    // Absolute stress
    const M = Math.abs(M_self_local) + Math.abs(M_settle_local * (1 - 2 * Math.abs(xi - 0.5)));
    const stress = (M * c) / I;

    data.push({ x: Math.round(x_total * 1000) / 1000, stress: Math.round(stress * 100) / 100 });
  }

  return data;
}
