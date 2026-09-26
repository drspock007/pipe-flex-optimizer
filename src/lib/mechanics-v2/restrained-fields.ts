// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Modifié par Giovanni Malagnino, 2026-09-26 15:20 CEST: single point evaluator (V2-9-R1).
// Field evaluation of a restrained result: Hermite z, y (the field used for
// displacements, compatibility, penetration and charts) and cubic moments
// reconstructed from the element equilibrium (momentCoeffsN).
// Shear convention (documented): Vv, Vl = dM/dx. With N != 0 this differs from
// the transverse force perpendicular to x: T = dM/dx - N w' (Vv - N slopeZ).
// Design maxima come from restrained-maxima.ts, never from these samples.

import { BiaxialSuccess, FieldValues } from "./types";
import type { CurveSample } from "./fields";
import { hermiteAt, momentCoeffsN, poly } from "./restrained-element";

export type RestrainedPoint = FieldValues & { Mres: number; sigma: number; sigmaCombined: number };

/** Fields of element e at u = xi/l in [0, 1] (caller validates). */
export function restrainedPoint(r: BiaxialSuccess, e: number, u: number): RestrainedPoint {
  const ax = r.axial!, m = r.members[e], ln = ax.lateral.nodes, al = ax.lateral.endActions[e];
  const { I, c, A, q } = r.input, N = ax.N, l = m.length;
  const dz = m.nodalDisplacements, dy = [ln[e].y, ln[e].theta, ln[e + 1].y, ln[e + 1].theta];
  const cv = momentCoeffsN(l, N, q, dz, m.endActions.Fi, m.endActions.Ci);
  const cl = momentCoeffsN(l, N, 0, dy, al[0], al[1]);
  const dv = (cc: number[]) => (cc[1] + u * (2 * cc[2] + 3 * u * cc[3])) / l;
  const hz = hermiteAt(l, dz, u), hy = hermiteAt(l, dy, u);
  const Mv = poly(cv, u), Ml = poly(cl, u), Mres = Math.hypot(Mv, Ml), sigma = (c * Mres) / I;
  return { x: m.xStart + u * l, z: hz.w, slopeZ: hz.slope, Mv, Vv: dv(cv), y: hy.w, slopeY: hy.slope, Ml, Vl: dv(cl), Mres, sigma, sigmaCombined: N / A + sigma };
}

/** Samples with `perMember` intervals per element; nodes included (left element at interfaces). */
export function sampleRestrained(r: BiaxialSuccess, perMember = 4): CurveSample[] {
  if (!Number.isInteger(perMember) || perMember < 1) {
    throw new RangeError(`sampleRestrained: perMember must be an integer >= 1, got ${perMember}`);
  }
  const { hl, hv } = r.input, out: CurveSample[] = [];
  r.members.forEach((_, e) => {
    for (let k = e === 0 ? 0 : 1; k <= perMember; k++) {
      const p = restrainedPoint(r, e, k / perMember);
      out.push({ ...p, deltaY: p.y - (hl * p.x) / r.L, deltaZ: p.z - (hv * p.x) / r.L });
    }
  });
  return out;
}
