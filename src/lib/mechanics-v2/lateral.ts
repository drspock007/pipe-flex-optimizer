// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Closed-form lateral plane over the full length (no lateral load, supports
// do not restrain y). Ml = EI y'', Vl = EI y'''.

export interface LateralPoint {
  y: number;
  slope: number;
  Ml: number;
  Vl: number;
}

export function lateralAt(x: number, L: number, hl: number, EI: number): LateralPoint {
  const s = x / L;
  return {
    y: hl * (3 * s * s - 2 * s ** 3),
    slope: (6 * hl * s * (1 - s)) / L,
    Ml: (6 * EI * hl * (1 - 2 * s)) / (L * L),
    Vl: (-12 * EI * hl) / L ** 3,
  };
}
