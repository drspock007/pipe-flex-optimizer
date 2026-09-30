// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Exact Euler-Bernoulli member in the vertical plane (DOFs z, theta = z').
// One member per interval between consecutive nodes; the quartic particular
// solution makes the reconstructed field exact under uniform load.

import { MemberResult } from "./types";

export function memberStiffness(EI: number, l: number): number[][] {
  const k = EI / (l * l * l);
  const l2 = l * l;
  return [
    [12 * k, 6 * l * k, -12 * k, 6 * l * k],
    [6 * l * k, 4 * l2 * k, -6 * l * k, 2 * l2 * k],
    [-12 * k, -6 * l * k, 12 * k, -6 * l * k],
    [6 * l * k, 2 * l2 * k, -6 * l * k, 4 * l2 * k],
  ];
}

/** Consistent nodal loads for a downward uniform load q (z positive upward). */
export function memberLoad(q: number, l: number): number[] {
  return [-q * l / 2, -q * l * l / 12, -q * l / 2, q * l * l / 12];
}

/** Member end actions re = ke*de - fe = [Fi, Ci, Fj, Cj]. */
export function memberEndActions(EI: number, q: number, l: number, de: number[]): number[] {
  const k = memberStiffness(EI, l);
  const f = memberLoad(q, l);
  return k.map((row, i) => row.reduce((s, v, j) => s + v * de[j], 0) - f[i]);
}

export interface MemberFieldPoint {
  z: number;
  slope: number;
  Mv: number;
  Vv: number;
}

/** Evaluate the exact vertical field at local coordinate xi in [0, l]. */
export function evaluateMember(m: MemberResult, xi: number): MemberFieldPoint {
  const l = m.length;
  const u = xi / l;
  const [zi, ti, zj, tj] = m.nodalDisplacements;
  const { Fi, Ci } = m.endActions;
  const N1 = 1 - 3 * u * u + 2 * u ** 3;
  const N2 = l * (u - 2 * u * u + u ** 3);
  const N3 = 3 * u * u - 2 * u ** 3;
  const N4 = l * (-u * u + u ** 3);
  const dN1 = (-6 * u + 6 * u * u) / l;
  const dN2 = 1 - 4 * u + 3 * u * u;
  const dN3 = (6 * u - 6 * u * u) / l;
  const dN4 = -2 * u + 3 * u * u;
  const qe = m.q / (24 * m.EI);
  const z = N1 * zi + N2 * ti + N3 * zj + N4 * tj - qe * xi * xi * (l - xi) * (l - xi);
  const slope =
    dN1 * zi + dN2 * ti + dN3 * zj + dN4 * tj - qe * 2 * xi * (l - xi) * (l - 2 * xi);
  return {
    z,
    slope,
    Mv: -Ci + Fi * xi - (m.q * xi * xi) / 2,
    Vv: Fi - m.q * xi,
  };
}

/** Mv(u) = a0 + a1 u + a2 u^2 in normalized local coordinate u = xi/l. */
export function momentCoefficients(m: MemberResult): [number, number, number] {
  const l = m.length;
  return [-m.endActions.Ci, m.endActions.Fi * l, (-m.q * l * l) / 2];
}
