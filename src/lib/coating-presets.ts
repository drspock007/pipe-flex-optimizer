// src/lib/coating-presets.ts
// Anti-corrosion coating types, densities, and thickness data.

export type CoatingType = "none" | "yellowJacket" | "sp2888" | "fbeAro" | "custom";

export const COATING_LABELS: Record<CoatingType, string> = {
  none: "None (bare pipe)",
  yellowJacket: "Yellow Jacket (PE)",
  sp2888: "SP-2888",
  fbeAro: "FBE-ARO",
  custom: "Custom",
};

// Densities in kg/m³
export const COATING_DENSITIES: Record<Exclude<CoatingType, "none" | "custom">, number> = {
  yellowJacket: 950,
  sp2888: 1250,
  fbeAro: 1350,
};

// Yellow Jacket standard thicknesses by NPS (adhesive + PE, in mm)
const YELLOW_JACKET_THICKNESSES: { nps: string; total: number }[] = [
  { nps: "3/4", total: 0.70 },
  { nps: "1 1/4", total: 0.76 },
  { nps: "2", total: 0.87 },
  { nps: "3", total: 0.89 },
  { nps: "4", total: 0.94 },
  { nps: "6", total: 1.09 },
  { nps: "8", total: 1.24 },
  { nps: "10", total: 1.24 },
  { nps: "12", total: 1.25 },
  { nps: "16", total: 1.25 },
  { nps: "20", total: 1.25 },
];

/** Get Yellow Jacket auto-thickness for a given NPS. Returns undefined if NPS not in table. */
export const getYellowJacketThickness = (nps: string): number | undefined =>
  YELLOW_JACKET_THICKNESSES.find(yj => yj.nps === nps)?.total;

/** Get coating density (kg/m³) for a given type. */
export const getCoatingDensity = (type: CoatingType, customDensity: number): number => {
  if (type === "none") return 0;
  if (type === "custom") return customDensity;
  return COATING_DENSITIES[type];
};

/**
 * Calculate coating linear weight (kg/m).
 * Wc = π × (Do + t_coat) × t_coat × ρ_coat × 1e-6
 * Do and t_coat in mm, density in kg/m³.
 */
export const calcCoatingWeight = (Do_mm: number, thickness_mm: number, density_kgm3: number): number => {
  if (thickness_mm <= 0 || density_kgm3 <= 0) return 0;
  return Math.PI * (Do_mm + thickness_mm) * thickness_mm * density_kgm3 * 1e-6;
};

/** Effective coating thickness (mm) and density (kg/m3) used by the calculation. */
export const effectiveCoating = (type: CoatingType, thickness: number, density: number, nps?: string) => {
  const effDensity = getCoatingDensity(type, density);
  const auto = type === "yellowJacket" && nps ? getYellowJacketThickness(nps) : undefined;
  const effThickness = type === "none" ? 0 : auto ?? thickness;
  return { thickness: effThickness, density: effDensity };
};
