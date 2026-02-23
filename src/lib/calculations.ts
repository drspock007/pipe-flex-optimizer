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

export const calculate = (inputs: PipeInputs): CalculationResults => {
  const { Do, t, L, h, grade, customYield, E, allowablePercent, includeSelfWeight, density } = inputs;
  
  const section = calcSectionProperties(Do, t, density);
  const yieldStrength = getYieldStrength(grade, customYield);
  const allowableStress = yieldStrength * (allowablePercent / 100);

  // Convert units for calculation
  const E_mpa = E * 1000;       // GPa → MPa
  const L_mm = L * 1000;        // m → mm
  const h_mm = h;               // already mm

  // Linear weight q in N/mm
  const g = 9.81;
  const q = includeSelfWeight ? density * g * section.A * 1e-6 : 0; // N/mm

  // Iterative support optimization
  let numSupports = 0;
  let maxStress = Infinity;
  let spanLength = L;
  let governingSpan = 0;

  for (let supports = 0; supports <= 100; supports++) {
    const numSpans = supports + 1;
    const span_m = L / numSpans;
    const span_mm = span_m * 1000;

    // Settlement per span (proportional)
    const h_span = h_mm / numSpans;

    // M_max = qL²/12 + 6EIh/L²
    const M_self = (q * span_mm * span_mm) / 12;
    const M_settlement = (6 * E_mpa * section.I * h_span) / (span_mm * span_mm);
    const M_max = M_self + M_settlement;

    const stress = (M_max * section.c) / section.I;

    if (supports === 0 || stress >= maxStress) {
      // For first iteration or find governing
    }
    
    maxStress = stress;
    numSupports = supports;
    spanLength = span_m;
    governingSpan = supports; // simplified: all spans equal

    if (stress <= allowableStress) break;
  }

  const isSafe = maxStress <= allowableStress;

  // Generate stress distribution data
  const stressData = generateStressDistribution(
    q, E_mpa, section.I, section.c, L_mm, h_mm, numSupports
  );

  // Support positions
  const supportPositions: number[] = [];
  if (numSupports > 0) {
    const spanM = L / (numSupports + 1);
    for (let i = 1; i <= numSupports; i++) {
      supportPositions.push(i * spanM);
    }
  }

  return {
    section,
    yieldStrength,
    allowableStress,
    q,
    maxStress,
    isSafe,
    numSupports,
    spanLength,
    governingSpan,
    stressData,
    supportPositions,
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
