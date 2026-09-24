// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Exact search of the resultant moment maximum per member and fibre angles.
// In a member Mv is quadratic and Ml linear in u = xi/l, so extrema of
// Mres^2 are at the ends or at real roots of Mv*Mv' + Ml*Ml' (a cubic).

import { MemberResult } from "./types";
import { momentCoefficients } from "./beam-member";

const evalPoly = (c: number[], u: number) => c.reduceRight((acc, v) => acc * u + v, 0);

/** Real roots in the open interval (0,1) of a polynomial of degree <= 3. */
export function rootsInUnit(coeffs: number[]): number[] {
  const scale = Math.max(...coeffs.map(Math.abs));
  if (!(scale > 0)) return []; // identically zero: every point is stationary
  const c = coeffs.map((v) => (Math.abs(v) / scale < 1e-14 ? 0 : v / scale));
  // Breakpoints: stationary points of the polynomial (roots of its derivative).
  const d = [c[1] ?? 0, 2 * (c[2] ?? 0), 3 * (c[3] ?? 0)];
  const breaks = [0, ...quadraticRoots(d).filter((u) => u > 0 && u < 1).sort(), 1];
  const roots: number[] = [];
  for (let k = 0; k < breaks.length - 1; k++) {
    let a = breaks[k];
    let b = breaks[k + 1];
    let fa = evalPoly(c, a);
    const fb = evalPoly(c, b);
    if (fa === 0 && a > 0) roots.push(a);
    if (fa * fb >= 0) continue;
    for (let it = 0; it < 200 && b - a > 1e-15; it++) {
      const m = 0.5 * (a + b);
      const fm = evalPoly(c, m);
      if (fa * fm <= 0) b = m;
      else {
        a = m;
        fa = fm;
      }
    }
    roots.push(0.5 * (a + b));
  }
  return roots.filter((u) => u > 0 && u < 1);
}

function quadraticRoots([c0, c1, c2]: number[]): number[] {
  if (c2 === 0) return c1 === 0 ? [] : [-c0 / c1];
  const disc = c1 * c1 - 4 * c2 * c0;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const t = -0.5 * (c1 + (c1 >= 0 ? sq : -sq));
  const r = [t / c2];
  if (t !== 0) r.push(c0 / t);
  return r;
}

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
  const [a0, a1, a2] = momentCoefficients(m);
  const [b0, b1] = lateralCoefficients(m, L, hl);
  const cubic = [a0 * a1 + b0 * b1, a1 * a1 + 2 * a0 * a2 + b1 * b1, 3 * a1 * a2, 2 * a2 * a2];
  const candidates = [0, 1, ...rootsInUnit(cubic)];
  let best: MemberMax | null = null;
  for (const u of candidates) {
    const Mv = a0 + a1 * u + a2 * u * u;
    const Ml = b0 + b1 * u;
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
