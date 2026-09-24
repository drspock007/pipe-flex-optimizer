// créé par Giovanni Malagnino, 2026-09-24 03:27 CEST (Europe/Rome, UTC+2)
// Field evaluation and chart sampling. Sampling is for display only and is
// never used to compute design maxima.

import { BiaxialSuccess, FieldValues } from "./types";
import { evaluateMember } from "./beam-member";
import { lateralAt } from "./lateral";

/** Evaluate all fields at x. side selects the member at a node (shear jumps). */
export function evaluateAt(r: BiaxialSuccess, x: number, side: "left" | "right" = "right"): FieldValues {
  const ms = r.members;
  let k = ms.findIndex((m) =>
    side === "right" ? x < m.xStart + m.length : x <= m.xStart + m.length,
  );
  if (k < 0) k = ms.length - 1;
  if (side === "left" && x <= ms[0].xStart) k = 0;
  const m = ms[k];
  const xi = Math.min(Math.max(x - m.xStart, 0), m.length);
  const v = evaluateMember(m, xi);
  const { EI } = m;
  const lat = lateralAt(x, r.L, r.input.hl, EI);
  return { x, z: v.z, slopeZ: v.slope, Mv: v.Mv, Vv: v.Vv, y: lat.y, slopeY: lat.slope, Ml: lat.Ml, Vl: lat.Vl };
}

export interface CurveSample extends FieldValues {
  deltaY: number; // y - hl*x/L (signed)
  deltaZ: number; // z - hv*x/L (signed)
  Mres: number;
  sigma: number;
}

/** Sample the curve with `perMember` intervals per member; ends and supports included. */
export function sampleCurve(r: BiaxialSuccess, perMember = 20): CurveSample[] {
  const out: CurveSample[] = [];
  const { I, c, hl, hv } = r.input;
  r.members.forEach((m, e) => {
    const start = e === 0 ? 0 : 1;
    for (let k = start; k <= perMember; k++) {
      const x = m.xStart + (m.length * k) / perMember;
      const f = evaluateAt(r, x, k === perMember ? "left" : "right");
      const Mres = Math.hypot(f.Mv, f.Ml);
      out.push({
        ...f,
        deltaY: f.y - (hl * x) / r.L,
        deltaZ: f.z - (hv * x) / r.L,
        Mres,
        sigma: (c * Mres) / I,
      });
    }
  });
  return out;
}
