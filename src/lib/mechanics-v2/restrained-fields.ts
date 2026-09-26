// créé par Giovanni Malagnino, 2026-09-26 14:30 CEST (Europe/Rome, UTC+2)
// Display sampling of a restrained result (charts only; maxima come from
// restrained-maxima.ts). Fields: Hermite z, y and cubic moments (momentCoeffsN).

import { BiaxialSuccess } from "./types";
import type { CurveSample } from "./fields";
import { hermiteAt, momentCoeffsN, poly } from "./restrained-element";

export function sampleRestrained(r: BiaxialSuccess, perMember = 4): CurveSample[] {
  const ax = r.axial!;
  const { I, c, A, hl, hv, q } = r.input;
  const N = ax.N, out: CurveSample[] = [];
  r.members.forEach((m, e) => {
    const dz = m.nodalDisplacements, al = ax.lateral.endActions[e];
    const ln = ax.lateral.nodes;
    const dy = [ln[e].y, ln[e].theta, ln[e + 1].y, ln[e + 1].theta];
    const cv = momentCoeffsN(m.length, N, q, dz, m.endActions.Fi, m.endActions.Ci);
    const cl = momentCoeffsN(m.length, N, 0, dy, al[0], al[1]);
    const dv = (cc: number[], u: number) => (cc[1] + u * (2 * cc[2] + 3 * u * cc[3])) / m.length;
    for (let k = e === 0 ? 0 : 1; k <= perMember; k++) {
      const u = k / perMember, x = m.xStart + u * m.length;
      const hz = hermiteAt(m.length, dz, u), hy = hermiteAt(m.length, dy, u);
      const Mv = poly(cv, u), Ml = poly(cl, u), Mres = Math.hypot(Mv, Ml), sigma = (c * Mres) / I;
      out.push({
        x, z: hz.w, slopeZ: hz.slope, Mv, Vv: dv(cv, u), y: hy.w, slopeY: hy.slope, Ml, Vl: dv(cl, u),
        deltaY: hy.w - (hl * x) / r.L, deltaZ: hz.w - (hv * x) / r.L, Mres, sigma, sigmaCombined: N / A + sigma,
      });
    }
  });
  return out;
}
