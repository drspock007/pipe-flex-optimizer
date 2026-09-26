// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Hermite beam element under a constant axial tension N (V2-9, axial mode
// "restrained"). DOFs per plane: [w_i, theta_i, w_j, theta_j], theta = w'.
// Geometric matrix kg1 = int N'^T N' dx is integrated EXACTLY (degree-4
// polynomial, closed form), so the axial energy EA/(8L) (d' G d)^2 is exact
// for the discrete field. End actions are computed without subtracting large
// terms: the bending part uses the deformation relative to the element chord
// (ke annihilates rigid motions exactly), the geometric part uses differences.

/** kg1 * de (without N). */
export function kgDot(l: number, de: ArrayLike<number>): [number, number, number, number] {
  const [wi, ti, wj, tj] = [de[0], de[1], de[2], de[3]];
  const dw = wi - wj, s = 30 * l;
  const r0 = (36 * dw + 3 * l * (ti + tj)) / s;
  const r1 = (3 * l * dw + l * l * (4 * ti - tj)) / s;
  const r3 = (3 * l * dw + l * l * (4 * tj - ti)) / s;
  return [r0, r1, -r0, r3];
}

/** Exact integral of (w')^2 over the element for the Hermite interpolant (mm). */
export function slopeSquared(l: number, de: ArrayLike<number>): number {
  const r = kgDot(l, de);
  return (de[0] - de[2]) * r[0] + de[1] * r[1] + de[3] * r[3];
}

/** ke * de computed from the chord-relative rotations (exactly equal, no cancellation of rigid motion). */
function bendDot(EI: number, l: number, de: ArrayLike<number>): [number, number, number, number] {
  const s = (de[2] - de[0]) / l;
  const a = de[1] - s, b = de[3] - s, k = EI / (l * l * l);
  const f = 6 * l * k * (a + b);
  return [f, k * l * l * (4 * a + 2 * b), -f, k * l * l * (2 * a + 4 * b)];
}

/** Element end actions re = (ke + N kg1) de - fe = [Fi, Ci, Fj, Cj] (q downward, w upward). */
export function endActionsN(EI: number, N: number, q: number, l: number, de: ArrayLike<number>): [number, number, number, number] {
  const b = bendDot(EI, l, de), g = kgDot(l, de);
  const fe = [-q * l / 2, -q * l * l / 12, -q * l / 2, q * l * l / 12];
  return [0, 1, 2, 3].map((k) => b[k] + N * g[k] - fe[k]) as [number, number, number, number];
}

/** Element matrix ke + N kg1 (upper triangle used by the band assembly). */
export function elementMatrixN(EI: number, N: number, l: number): number[][] {
  const k = EI / l ** 3, l2 = l * l, g = N / (30 * l);
  return [
    [12 * k + 36 * g, 6 * l * k + 3 * l * g, -12 * k - 36 * g, 6 * l * k + 3 * l * g],
    [6 * l * k + 3 * l * g, 4 * l2 * k + 4 * l2 * g, -6 * l * k - 3 * l * g, 2 * l2 * k - l2 * g],
    [-12 * k - 36 * g, -6 * l * k - 3 * l * g, 12 * k + 36 * g, -6 * l * k - 3 * l * g],
    [6 * l * k + 3 * l * g, 2 * l2 * k - l2 * g, -6 * l * k - 3 * l * g, 4 * l2 * k + 4 * l2 * g],
  ];
}

/** Moment M(u), u = xi/l in [0,1], cubic: M = -Ci + Fi xi - q xi^2/2 + N (w(xi) - w_i),
 *  from M'' = N w'' - q (equilibrium of the tensioned beam) with the Hermite field. */
export function momentCoeffsN(l: number, N: number, q: number, de: ArrayLike<number>, Fi: number, Ci: number): [number, number, number, number] {
  const ti = de[1], tj = de[3], dw = de[2] - de[0];
  return [-Ci, Fi * l + N * l * ti, (-q * l * l) / 2 + N * (3 * dw - l * (2 * ti + tj)), N * (l * (ti + tj) - 2 * dw)];
}

/** Hermite value and slope at u. */
export function hermiteAt(l: number, de: ArrayLike<number>, u: number): { w: number; slope: number } {
  const [wi, ti, wj, tj] = [de[0], de[1], de[2], de[3]];
  const w = (1 - 3 * u * u + 2 * u ** 3) * wi + l * (u - 2 * u * u + u ** 3) * ti + (3 * u * u - 2 * u ** 3) * wj + l * (-u * u + u ** 3) * tj;
  const slope = ((-6 * u + 6 * u * u) * wi + (6 * u - 6 * u * u) * wj) / l + (1 - 4 * u + 3 * u * u) * ti + (-2 * u + 3 * u * u) * tj;
  return { w, slope };
}

export const poly = (c: ArrayLike<number>, u: number) => ((c[3] * u + c[2]) * u + c[1]) * u + c[0];
