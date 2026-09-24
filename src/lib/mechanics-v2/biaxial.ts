// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni malagnino, 2026-09-24 03:33 CEST (Europe/Rome, UTC+2)
// Exact search of the resultant moment maximum per member and fibre angles.
// In a member Mv is quadratic and Ml linear in u = xi/l, so extrema of
// Mres^2 are at the ends or at real roots of Mv*Mv' + Ml*Ml' (a cubic).

import { MemberResult } from "./types";
import { momentCoefficients } from "./beam-member";
import { rootsInUnit } from "./roots";

export { rootsInUnit };

export interface MemberMax {
  xi: number;
  Mv: number;
  Ml: number;
  Mres: number;
}

/** Ml(u) = b0 + b1 u for the member, given lateral closed form. */
export function lateralCoefficients(m: MemberResult, L: number, hl: number): [number, number] {
  const b0 = (6 * m.EI * hl * (1 - (2 * m.xStart) / L)) / (L * L);
  const b1 = (-12 * m.EI * hl * m.length) / L ** 3;
  return [b0, b1];
}

export function memberMaximum(m: MemberResult, L: number, hl: number): MemberMax {
  const a = momentCoefficients(m);
  const b = lateralCoefficients(m, L, hl);
  // Normalize before forming products to avoid overflow in the extremum cubic.
  const M = Math.max(...a.map(Math.abs), ...b.map(Math.abs));
  const candidates = [0, 1];
  if (M > 0 && Number.isFinite(M)) {
    const [a0, a1, a2] = a.map((v) => v / M);
    const [b0, b1] = b.map((v) => v / M);
    const cubic = [a0 * a1 + b0 * b1, a1 * a1 + 2 * a0 * a2 + b1 * b1, 3 * a1 * a2, 2 * a2 * a2];
    candidates.push(...rootsInUnit(cubic));
  }
  let best: MemberMax | null = null;
  for (const u of candidates) {
    const Mv = a[0] + a[1] * u + a[2] * u * u;
    const Ml = b[0] + b[1] * u;
    const Mres = Math.hypot(Mv, Ml);
    if (!best || Mres > best.Mres) best = { xi: u * m.length, Mv, Ml, Mres };
  }
  return best!;
}

/** Fibre angles (Y = c cos phi, Z = c sin phi); null when Mres ~ 0. */
export function fibreAngles(Mv: number, Ml: number, tolMoment: number) {
  if (Math.hypot(Mv, Ml) <= tolMoment) return { phiTension: null, phiCompression: null };
  return { phiTension: Math.atan2(-Mv, -Ml), phiCompression: Math.atan2(Mv, Ml) };
}

/** Longitudinal stress at fibre angle phi: sigmaXX = -(Ml*Y + Mv*Z)/I. */
export const fibreStress = (Mv: number, Ml: number, I: number, c: number, phi: number) =>
  -(Ml * c * Math.cos(phi) + Mv * c * Math.sin(phi)) / I;
